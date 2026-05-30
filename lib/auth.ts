import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DEMO_USER_EMAIL, DEMO_USER_ID, isSupabaseConfigured } from "@/lib/env";

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  dailyGoal: number;
  timezone: string;
};

/**
 * Resolve the current signed-in user, ensure a row exists in our `users` table,
 * and return it. If Supabase isn't configured we silently use the demo user so
 * the app remains explorable in greenfield mode.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  if (!isSupabaseConfigured) {
    // Demo fallback — useful for local exploration and Vercel preview without secrets.
    const demo = await prisma.user.upsert({
      where: { id: DEMO_USER_ID },
      update: {},
      create: {
        id: DEMO_USER_ID,
        email: DEMO_USER_EMAIL,
        name: "Demo Builder",
        timezone: "America/Los_Angeles",
      },
    });
    return {
      id: demo.id,
      email: demo.email,
      name: demo.name,
      image: demo.image,
      dailyGoal: demo.dailyGoal,
      timezone: demo.timezone,
    };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Mirror the Supabase auth user into our domain table (read-first; write only when needed).
  const name =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    null;
  const image = (user.user_metadata?.avatar_url as string | undefined) ?? null;
  const email = user.email ?? `${user.id}@unknown.local`;

  const existing = await prisma.user.findUnique({ where: { id: user.id } });
  if (existing) {
    if (existing.email !== email || existing.name !== name || existing.image !== image) {
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { email, name, image },
      });
      return {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        image: updated.image,
        dailyGoal: updated.dailyGoal,
        timezone: updated.timezone,
      };
    }
    return {
      id: existing.id,
      email: existing.email,
      name: existing.name,
      image: existing.image,
      dailyGoal: existing.dailyGoal,
      timezone: existing.timezone,
    };
  }

  const created = await prisma.user.create({
    data: { id: user.id, email, name, image },
  });

  return {
    id: created.id,
    email: created.email,
    name: created.name,
    image: created.image,
    dailyGoal: created.dailyGoal,
    timezone: created.timezone,
  };
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  return user;
}
