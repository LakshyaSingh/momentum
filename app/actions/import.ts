"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { ApplicationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { responseReceivedForStatus } from "@/lib/response-received";
import { applicationStatsTag } from "@/lib/streak";
import { resolveCompanyDomainCandidates } from "@/lib/company-logo";

export interface ImportRowInput {
  company: string;
  role: string;
  location?: string;
  jobLink?: string;
  applicationDate: string; // ISO string from client
  status: ApplicationStatus;
  salary?: string;
  recruiter?: string;
  referral?: string;
  notes?: string;
  followUpDate?: string;
  interviewStage?: string;
  offerStatus?: string;
}

export type ImportResult =
  | { ok: true; inserted: number; skipped: number }
  | { ok: false; error: string };

export async function importApplications(rows: ImportRowInput[]): Promise<ImportResult> {
  try {
    const user = await requireUser();
    const cleaned = rows
      .filter((r) => r.company && r.role && r.applicationDate)
      .map((r) => ({
        userId: user.id,
        company: r.company,
        companyDomain: resolveCompanyDomainCandidates({
          company: r.company,
          jobLink: r.jobLink,
        })[0] ?? null,
        role: r.role,
        location: r.location ?? null,
        jobLink: r.jobLink ?? null,
        applicationDate: new Date(r.applicationDate),
        status: r.status,
        salary: r.salary ?? null,
        recruiter: r.recruiter ?? null,
        referral: r.referral ?? null,
        notes: r.notes ?? null,
        followUpDate: r.followUpDate ? new Date(r.followUpDate) : null,
        responseReceived: responseReceivedForStatus(r.status),
        interviewStage: r.interviewStage ?? null,
        offerStatus: r.offerStatus ?? null,
      }));

    if (cleaned.length === 0) {
      return { ok: false, error: "No valid rows to import." };
    }

    // Batch the inserts so each transaction stays short and avoids hitting
    // Supabase's pgbouncer transaction timeout. Bulk imports of ~1700+ rows in
    // a single transaction get killed with "Server has closed the connection".
    const BATCH_SIZE = 200;
    let totalInserted = 0;

    for (let i = 0; i < cleaned.length; i += BATCH_SIZE) {
      const batch = cleaned.slice(i, i + BATCH_SIZE);
      // Tag each batch with a unique createdAt window so we can read it back.
      const batchStart = new Date();

      // Run each batch as its own transaction. createMany is atomic per call.
      await prisma.$transaction(async (tx) => {
        const result = await tx.application.createMany({ data: batch });
        // Read back the rows we just inserted for this user, then write the
        // matching status events. We use createdAt >= batchStart to avoid
        // colliding with any other concurrent imports for the same user.
        const inserted = await tx.application.findMany({
          where: { userId: user.id, createdAt: { gte: batchStart } },
          orderBy: { createdAt: "desc" },
          take: result.count,
        });
        if (inserted.length > 0) {
          await tx.statusEvent.createMany({
            data: inserted.map((a) => ({
              applicationId: a.id,
              status: a.status,
              occurredAt: a.applicationDate,
            })),
          });
        }
        totalInserted += inserted.length;
      });
    }

    revalidatePath("/dashboard");
    revalidatePath("/applications");
    revalidatePath("/analytics");
    revalidatePath("/calendar");
    revalidateTag(applicationStatsTag(user.id));

    return {
      ok: true,
      inserted: totalInserted,
      skipped: rows.length - totalInserted,
    };
  } catch (err) {
    console.error("importApplications failed", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Import failed",
    };
  }
}
