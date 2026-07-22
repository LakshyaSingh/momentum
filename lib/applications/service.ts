import { revalidatePath, revalidateTag } from "next/cache";
import { ApplicationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
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
import {
  applicationsOrderBy,
  buildApplicationsWhere,
  clampApplicationsPage,
  toApplicationRow,
  type ApplicationsQuery,
} from "@/lib/applications-list";
import type { ApplicationRow } from "@/components/applications/data-table";
import {
  buildFunnel,
  buildProductivity,
  statusBreakdown,
  topCompanies,
  type FunnelStage,
  type ProductivityStats,
} from "@/lib/analytics";

/**
 * Shared, `userId`-parameterized application logic. The web Server Actions
 * (`app/actions/applications.ts`) and the MCP resource server
 * (`app/api/[transport]/route.ts`) both call these — the actions after a
 * cookie-session `requireUser()`, the MCP route after bearer-token validation.
 * Keeping the logic here means validation and cache invalidation stay identical
 * across both entry points.
 */

export type CreateApplicationResult =
  | {
      ok: true;
      id: string;
      motivation: { quoteId: number };
      milestone: number | null;
      currentStreak: number;
    }
  | { ok: false; error: string };

export type MutationResult = { ok: true } | { ok: false; error: string };

/** Mirror of the invalidation the web app performs after any write. */
function revalidateAll(userId: string) {
  try {
    revalidatePath("/dashboard");
    revalidatePath("/applications");
    revalidatePath("/analytics");
    revalidatePath("/calendar");
    revalidateTag(applicationStatsTag(userId));
  } catch (err) {
    // revalidate* require the Next request store; a stray call outside it must
    // never fail an otherwise-successful write.
    console.error("revalidateAll skipped", err);
  }
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

function pickMotivation() {
  // The web client maps this seed onto content/jobs-quotes.ts.
  return { quoteId: Math.floor(Math.random() * 1000) };
}

function errorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}

export async function createApplicationForUser(
  userId: string,
  timezone: string,
  input: ApplicationInput,
): Promise<CreateApplicationResult> {
  try {
    const data = ApplicationSchema.parse(input);

    const before = await computeStreaksUncached(userId, timezone);

    const created = await prisma.application.create({
      data: {
        userId,
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

    const after = await computeStreaksUncached(userId, timezone);
    revalidateAll(userId);

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
    console.error("createApplicationForUser failed", err);
    return { ok: false, error: errorMessage(err) };
  }
}

export async function updateApplicationForUser(
  userId: string,
  input: { id: string } & Partial<ApplicationInput>,
): Promise<MutationResult> {
  try {
    const data = ApplicationUpdateSchema.parse(input);

    const existing = await prisma.application.findFirst({
      where: { id: data.id, userId },
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
          data.companyDomain ??
          companyDomainFor({ company: nextCompany, jobLink: nextJobLink }),
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

    revalidateAll(userId);
    return { ok: true };
  } catch (err) {
    console.error("updateApplicationForUser failed", err);
    return { ok: false, error: errorMessage(err) };
  }
}

export async function deleteApplicationForUser(
  userId: string,
  id: string,
): Promise<MutationResult> {
  await prisma.application.deleteMany({ where: { id, userId } });
  revalidateAll(userId);
  return { ok: true };
}

export async function transitionStatusForUser(
  userId: string,
  id: string,
  status: ApplicationStatus,
): Promise<MutationResult> {
  const existing = await prisma.application.findFirst({
    where: { id, userId },
  });
  if (!existing) return { ok: false, error: "Not found" };
  if (existing.status === status) return { ok: true };

  await prisma.application.update({
    where: { id },
    data: {
      status,
      events: { create: { status } },
      responseReceived: responseReceivedForStatus(status),
    },
  });
  revalidateAll(userId);
  return { ok: true };
}

export type ListApplicationsResult = {
  rows: ApplicationRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export async function listApplicationsForUser(
  userId: string,
  query: ApplicationsQuery,
): Promise<ListApplicationsResult> {
  const where = buildApplicationsWhere(userId, query);
  const total = await prisma.application.count({ where });
  const page = clampApplicationsPage(query.page, total, query.pageSize);
  const apps = await prisma.application.findMany({
    where,
    orderBy: applicationsOrderBy(query),
    skip: (page - 1) * query.pageSize,
    take: query.pageSize,
  });
  return {
    rows: apps.map(toApplicationRow),
    total,
    page,
    pageSize: query.pageSize,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

export type ApplicationDetail = ApplicationRow & {
  timeline: { status: ApplicationStatus; occurredAt: string; note: string | null }[];
};

export async function getApplicationForUser(
  userId: string,
  id: string,
): Promise<ApplicationDetail | null> {
  const app = await prisma.application.findFirst({
    where: { id, userId },
    include: { events: { orderBy: { occurredAt: "asc" } } },
  });
  if (!app) return null;
  return {
    ...toApplicationRow(app),
    timeline: app.events.map((e) => ({
      status: e.status,
      occurredAt: e.occurredAt.toISOString(),
      note: e.note,
    })),
  };
}

export type SearchSummary = {
  total: number;
  streak: { current: number; longest: number; appliedToday: number };
  statusBreakdown: Record<ApplicationStatus, number>;
  funnel: FunnelStage[];
  productivity: ProductivityStats;
  topCompanies: ReturnType<typeof topCompanies>;
};

/**
 * One-shot snapshot for natural-language querying by a connecting agent:
 * funnel, productivity, streak, per-status counts, and top companies.
 */
export async function getSearchSummaryForUser(
  userId: string,
  timezone: string,
): Promise<SearchSummary> {
  const applications = await prisma.application.findMany({
    where: { userId },
    include: { events: true },
    orderBy: { applicationDate: "desc" },
  });

  const streaks = await computeStreaksUncached(userId, timezone);

  return {
    total: applications.length,
    streak: {
      current: streaks.current,
      longest: streaks.longest,
      appliedToday: streaks.appliedToday,
    },
    statusBreakdown: statusBreakdown(applications),
    funnel: buildFunnel(applications),
    productivity: buildProductivity(applications, streaks.longest),
    topCompanies: topCompanies(applications),
  };
}
