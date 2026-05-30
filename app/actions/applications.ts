"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { ApplicationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import {
  ApplicationSchema,
  ApplicationUpdateSchema,
  type ApplicationInput,
} from "@/lib/validators";
import {
  applicationStatsTag,
  computeStreaksUncached,
  milestoneFor,
} from "@/lib/streak";
import { responseReceivedForStatus } from "@/lib/response-received";
import { resolveCompanyDomainCandidates } from "@/lib/company-logo";

export type CreateApplicationResult =
  | {
      ok: true;
      id: string;
      motivation: { quoteId: number };
      milestone: number | null;
      currentStreak: number;
    }
  | { ok: false; error: string };

function revalidateAll(userId: string) {
  revalidatePath("/dashboard");
  revalidatePath("/applications");
  revalidatePath("/analytics");
  revalidatePath("/calendar");
  revalidateTag(applicationStatsTag(userId));
}

function companyDomainFor(data: {
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

export async function createApplication(
  input: ApplicationInput,
): Promise<CreateApplicationResult> {
  try {
    const user = await requireUser();
    const data = ApplicationSchema.parse(input);

    const before = await computeStreaksUncached(user.id, user.timezone);

    const created = await prisma.application.create({
      data: {
        userId: user.id,
        company: data.company,
        companyDomain: companyDomainFor(data),
        role: data.role,
        location: data.location,
        jobLink: data.jobLink,
        applicationDate: data.applicationDate,
        status: data.status,
        salary: data.salary,
        recruiter: data.recruiter,
        referral: data.referral,
        notes: data.notes,
        followUpDate: data.followUpDate ?? null,
        responseReceived: responseReceivedForStatus(data.status),
        interviewStage: data.interviewStage,
        offerStatus: data.offerStatus,
        events: {
          create: { status: data.status, occurredAt: data.applicationDate },
        },
      },
    });

    const after = await computeStreaksUncached(user.id, user.timezone);
    revalidateAll(user.id);

    const reachedMilestone =
      after.current > before.current ? milestoneFor(after.current) : null;

    return {
      ok: true,
      id: created.id,
      motivation: pickMotivation(),
      milestone: reachedMilestone,
      currentStreak: after.current,
    };
  } catch (err) {
    console.error("createApplication failed", err);
    return { ok: false, error: errorMessage(err) };
  }
}

export async function updateApplication(
  input: { id: string } & Partial<ApplicationInput>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const user = await requireUser();
    const data = ApplicationUpdateSchema.parse(input);

    const existing = await prisma.application.findFirst({
      where: { id: data.id, userId: user.id },
    });
    if (!existing) return { ok: false, error: "Not found" };

    const statusChanged = data.status && data.status !== existing.status;
    const nextStatus = (data.status ?? existing.status) as ApplicationStatus;
    const nextCompany = data.company ?? existing.company;
    const nextJobLink = data.jobLink ?? existing.jobLink ?? undefined;

    await prisma.application.update({
      where: { id: data.id },
      data: {
        company: data.company,
        companyDomain:
          data.companyDomain ?? companyDomainFor({ company: nextCompany, jobLink: nextJobLink }),
        role: data.role,
        location: data.location,
        jobLink: data.jobLink,
        applicationDate: data.applicationDate,
        status: data.status,
        salary: data.salary,
        recruiter: data.recruiter,
        referral: data.referral,
        notes: data.notes,
        followUpDate: data.followUpDate ?? undefined,
        responseReceived: responseReceivedForStatus(nextStatus),
        interviewStage: data.interviewStage,
        offerStatus: data.offerStatus,
        ...(statusChanged && {
          events: { create: { status: data.status as ApplicationStatus } },
        }),
      },
    });

    revalidateAll(user.id);
    return { ok: true };
  } catch (err) {
    console.error("updateApplication failed", err);
    return { ok: false, error: errorMessage(err) };
  }
}

export async function deleteApplication(id: string) {
  const user = await requireUser();
  await prisma.application.deleteMany({ where: { id, userId: user.id } });
  revalidateAll(user.id);
  return { ok: true } as const;
}

export async function transitionStatus(id: string, status: ApplicationStatus) {
  const user = await requireUser();
  const existing = await prisma.application.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) return { ok: false as const, error: "Not found" };
  if (existing.status === status) return { ok: true as const };

  await prisma.application.update({
    where: { id },
    data: {
      status,
      events: { create: { status } },
      responseReceived: responseReceivedForStatus(status),
    },
  });
  revalidateAll(user.id);
  return { ok: true as const };
}

function pickMotivation() {
  // The client maps this seed onto content/jobs-quotes.ts.
  return {
    quoteId: Math.floor(Math.random() * 1000),
  };
}

function errorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}
