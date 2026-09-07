"use server";

import { ApplicationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import {
  ApplicationSchema,
  QueuedJobSchema,
  QueuedJobUpdateSchema,
  type QueuedJobInput,
  type QueuedJobUpdate,
} from "@/lib/validators";
import { toQueuedJobRow, type QueuedJobRow } from "@/lib/queued-jobs";
import { extractJobFieldsFromUrl } from "@/lib/job-link/extract-fields";
import type { ParsedJobFields } from "@/lib/job-link/types";
import { resolveCompanyDomainCandidates } from "@/lib/company-logo";
import { resolvePersistedCompanyDomain } from "@/lib/company-lookup";
import { responseReceivedForStatus } from "@/lib/response-received";
import { computeStreaksUncached, milestoneFor } from "@/lib/streak";
import { pickMotivationSeed } from "@/lib/motivation-seed";
import {
  revalidateAllApplicationSurfaces,
  revalidateQueueSurfaces,
} from "@/lib/revalidate-applications";
import type { CreateApplicationResult } from "@/lib/applications/service";

export type QueuedJobResult =
  | { ok: true; job: QueuedJobRow }
  | { ok: false; error: string };

/**
 * Resolve a company domain the same way `createApplication` does: an explicit
 * value always wins, including the empty string, which means "the user cleared
 * this, show initials" rather than "infer one".
 */
/** Best-effort company/role/location from the URL alone. Never touches the network. */
function urlFieldsFor(jobLink: string): ParsedJobFields | null {
  try {
    const result = extractJobFieldsFromUrl(jobLink);
    return result.ok ? result.fields : null;
  } catch {
    // URL heuristics are a nicety — a row with just a link is still useful.
    return null;
  }
}

function queuedCompanyDomain(data: {
  company?: string;
  companyDomain?: string;
  jobLink?: string;
}): string | undefined {
  return (
    data.companyDomain ??
    resolveCompanyDomainCandidates({
      company: data.company,
      jobLink: data.jobLink,
    })[0]
  );
}

/**
 * Queue a job from a pasted link.
 *
 * This must stay fast: capture is a tight paste-Enter-paste loop, so it only
 * runs `extractJobFieldsFromUrl`, which reads the URL itself and performs no
 * network I/O. The full page parse (`POST /api/jobs/parse`) can take upwards of
 * ten seconds per link and is fired separately by the client afterwards, which
 * then patches the row through `updateQueuedJob`.
 */
export async function createQueuedJob(input: QueuedJobInput): Promise<QueuedJobResult> {
  try {
    const user = await requireUser();
    const data = QueuedJobSchema.parse(input);

    // Anything the caller supplied wins; otherwise guess from the URL shape.
    const guessed = data.company && data.role ? null : urlFieldsFor(data.jobLink);
    const company = data.company ?? guessed?.company;
    const role = data.role ?? guessed?.role;
    const location = data.location ?? guessed?.location;

    const created = await prisma.queuedJob.create({
      data: {
        userId: user.id,
        jobLink: data.jobLink,
        company: company ?? null,
        companyDomain:
          queuedCompanyDomain({
            company,
            companyDomain: data.companyDomain,
            jobLink: data.jobLink,
          }) ?? null,
        role: role ?? null,
        location: location ?? null,
        salary: data.salary ?? null,
        notes: data.notes ?? null,
      },
    });

    // Deliberately no revalidation here. Capture is a tight loop and the
    // client already holds the returned row; revalidating would push a fresh
    // RSC payload mid-loop that can land *after* background enrichment has
    // patched the row locally, briefly reverting it. Every other queue action
    // revalidates, and /dashboard reads the count uncached, so nothing goes
    // stale for longer than a navigation.
    return { ok: true, job: toQueuedJobRow(created) };
  } catch (err) {
    console.error("createQueuedJob failed", err);
    return { ok: false, error: errorMessage(err) };
  }
}

export async function updateQueuedJob(input: QueuedJobUpdate): Promise<QueuedJobResult> {
  try {
    const user = await requireUser();
    const data = QueuedJobUpdateSchema.parse(input);

    const existing = await prisma.queuedJob.findFirst({
      where: { id: data.id, userId: user.id },
    });
    if (!existing) return { ok: false, error: "Not found" };

    const nextCompany = data.company ?? existing.company ?? undefined;
    const nextJobLink = data.jobLink ?? existing.jobLink;

    const updated = await prisma.queuedJob.update({
      where: { id: data.id },
      data: {
        jobLink: data.jobLink,
        company: data.company,
        companyDomain:
          data.companyDomain ??
          queuedCompanyDomain({ company: nextCompany, jobLink: nextJobLink }),
        role: data.role,
        location: data.location,
        salary: data.salary,
        notes: data.notes,
      },
    });

    revalidateQueueSurfaces();
    return { ok: true, job: toQueuedJobRow(updated) };
  } catch (err) {
    console.error("updateQueuedJob failed", err);
    return { ok: false, error: errorMessage(err) };
  }
}

export async function deleteQueuedJob(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const user = await requireUser();
    await prisma.queuedJob.deleteMany({ where: { id, userId: user.id } });
    revalidateQueueSurfaces();
    return { ok: true };
  } catch (err) {
    console.error("deleteQueuedJob failed", err);
    return { ok: false, error: errorMessage(err) };
  }
}

/**
 * Promote a queued job into a real application, dated today.
 *
 * Today's date is the honest one: the habit being tracked is applying, not
 * finding, so the streak should land on the day the user actually applied
 * rather than the day they saved the link.
 *
 * Returns the same shape as `createApplication` so the caller can fire the
 * motivation overlay identically — the celebration belongs here, at the point
 * the work is genuinely done, not when the link was first queued.
 */
export async function applyQueuedJob(input: {
  id: string;
}): Promise<CreateApplicationResult> {
  try {
    const user = await requireUser();

    const queued = await prisma.queuedJob.findFirst({
      where: { id: input.id, userId: user.id },
    });
    if (!queued) return { ok: false, error: "Not found" };

    // ApplicationSchema requires company and role; a queue row may still be
    // missing them if the page parse failed. The UI routes those rows to the
    // prefilled form instead, so this is a guard, not the common path.
    const parsed = ApplicationSchema.safeParse({
      company: queued.company ?? "",
      companyDomain: queued.companyDomain ?? undefined,
      role: queued.role ?? "",
      location: queued.location ?? undefined,
      jobLink: queued.jobLink,
      applicationDate: new Date(),
      status: ApplicationStatus.APPLIED,
      salary: queued.salary ?? undefined,
      notes: queued.notes ?? undefined,
    });
    if (!parsed.success) {
      return { ok: false, error: "Add a company and role before applying." };
    }
    const data = parsed.data;

    const before = await computeStreaksUncached(user.id, user.timezone);
    // Resolved before the transaction opens: this can hit the network, and a
    // database transaction must never be held open across one.
    const companyDomain = await resolvePersistedCompanyDomain(data);

    const created = await prisma.$transaction(async (tx) => {
      const application = await tx.application.create({
        data: {
          userId: user.id,
          company: data.company,
          companyDomain,
          role: data.role,
          location: data.location,
          jobLink: data.jobLink,
          applicationDate: data.applicationDate,
          status: data.status,
          salary: data.salary,
          notes: data.notes,
          responseReceived: responseReceivedForStatus(data.status),
          events: {
            create: { status: data.status, occurredAt: data.applicationDate },
          },
        },
      });

      await tx.queuedJob.delete({ where: { id: queued.id } });
      return application;
    });

    const after = await computeStreaksUncached(user.id, user.timezone);
    revalidateAllApplicationSurfaces(user.id);

    const reachedMilestone =
      after.current > before.current ? milestoneFor(after.current) : null;

    return {
      ok: true,
      id: created.id,
      motivation: pickMotivationSeed(),
      milestone: reachedMilestone,
      currentStreak: after.current,
    };
  } catch (err) {
    console.error("applyQueuedJob failed", err);
    return { ok: false, error: errorMessage(err) };
  }
}

function errorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}
