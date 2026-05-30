"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { isSupabaseAdminConfigured, isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_TIMEZONE, isValidIanaTimezone } from "@/lib/timezone";

const PreferencesSchema = z.object({
  name: z.string().max(80).optional(),
  dailyGoal: z.number().int().min(1).max(50),
  timezone: z.string().min(1).max(64),
});

export async function updatePreferences(
  input: z.infer<typeof PreferencesSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const user = await requireUser();
    const data = PreferencesSchema.parse(input);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: data.name?.trim() || null,
        dailyGoal: data.dailyGoal,
        timezone: data.timezone,
      },
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Update failed" };
  }
}

/** Set timezone from the browser when the account still uses the default UTC. */
export async function syncBrowserTimezone(
  clientTimezone: string,
): Promise<{ ok: true; updated: boolean } | { ok: false; error: string }> {
  try {
    if (!isValidIanaTimezone(clientTimezone)) {
      return { ok: false, error: "Invalid timezone." };
    }

    const user = await requireUser();
    if (user.timezone !== DEFAULT_TIMEZONE) {
      return { ok: true, updated: false };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { timezone: clientTimezone },
    });
    revalidatePath("/", "layout");
    return { ok: true, updated: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Sync failed" };
  }
}

export async function exportApplicationsCsv(): Promise<string> {
  const user = await requireUser();
  const apps = await prisma.application.findMany({
    where: { userId: user.id },
    orderBy: { applicationDate: "desc" },
  });

  const headers = [
    "Company", "Role", "Location", "Job Link", "Applied", "Status",
    "Salary", "Recruiter", "Referral", "Follow-up", "Response received",
    "Interview stage", "Offer status", "Notes",
  ];
  const rows = apps.map((a) => [
    a.company, a.role, a.location ?? "", a.jobLink ?? "",
    a.applicationDate.toISOString().slice(0, 10),
    a.status, a.salary ?? "", a.recruiter ?? "", a.referral ?? "",
    a.followUpDate ? a.followUpDate.toISOString().slice(0, 10) : "",
    a.responseReceived ? "Yes" : "No",
    a.interviewStage ?? "", a.offerStatus ?? "",
    (a.notes ?? "").replace(/\r?\n/g, " "),
  ]);

  return [headers, ...rows]
    .map((r) => r.map(csvCell).join(","))
    .join("\r\n");
}

function csvCell(value: string) {
  if (value.includes(",") || value.includes("\"") || value.includes("\n")) {
    return `"${value.replace(/"/g, "\"\"")}"`;
  }
  return value;
}

export async function deleteAllApplications(): Promise<{ ok: true; count: number }> {
  const user = await requireUser();
  const result = await prisma.application.deleteMany({ where: { userId: user.id } });
  revalidatePath("/", "layout");
  return { ok: true, count: result.count };
}

export async function deleteAccount(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const user = await requireUser();

  if (isSupabaseConfigured) {
    if (!isSupabaseAdminConfigured) {
      return {
        ok: false,
        error:
          "Server is missing SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY). Your login was not removed — add the key in Vercel and redeploy.",
      };
    }

    const admin = createSupabaseAdminClient();
    if (!admin) {
      return { ok: false, error: "Auth admin client unavailable." };
    }

    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) {
      return { ok: false, error: `Could not delete login: ${error.message}` };
    }
  }

  await prisma.user.delete({ where: { id: user.id } });

  if (isSupabaseConfigured) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
  }

  redirect("/");
}
