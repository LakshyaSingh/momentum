import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  applicationStatsTag,
  computeStreaksForUser,
  type StreakInfo,
  weekSeriesFromDailyCounts,
} from "@/lib/streak";
import { totalApplicationsFromDailyCounts } from "@/lib/application-stats";
import type { ApplicationRow } from "@/components/applications/data-table";

export type DashboardSnapshot = {
  streaks: StreakInfo;
  totalAll: number;
  recentRows: ApplicationRow[];
  weekTotal: number;
};

function toApplicationRow(a: {
  id: string;
  company: string;
  companyDomain: string | null;
  role: string;
  location: string | null;
  jobLink: string | null;
  applicationDate: Date;
  status: ApplicationRow["status"];
  salary: string | null;
  recruiter: string | null;
  referral: string | null;
  notes: string | null;
  followUpDate: Date | null;
  responseReceived: boolean;
  interviewStage: string | null;
  offerStatus: string | null;
}): ApplicationRow {
  return {
    id: a.id,
    company: a.company,
    companyDomain: a.companyDomain,
    role: a.role,
    location: a.location,
    jobLink: a.jobLink,
    applicationDate: a.applicationDate.toISOString(),
    status: a.status,
    salary: a.salary,
    recruiter: a.recruiter,
    referral: a.referral,
    notes: a.notes,
    followUpDate: a.followUpDate ? a.followUpDate.toISOString() : null,
    responseReceived: a.responseReceived,
    interviewStage: a.interviewStage,
    offerStatus: a.offerStatus,
  };
}

async function loadDashboardSnapshot(
  userId: string,
  timezone: string,
): Promise<DashboardSnapshot> {
  const timeZone = timezone || "UTC";
  const [streaks, recent] = await Promise.all([
    computeStreaksForUser(userId, timeZone),
    prisma.application.findMany({
      where: { userId },
      orderBy: { applicationDate: "desc" },
      take: 6,
    }),
  ]);

  const weekDays = weekSeriesFromDailyCounts(streaks.dailyCounts, timeZone, 7);
  const weekTotal = weekDays.reduce((sum, day) => sum + day.count, 0);

  return {
    streaks,
    totalAll: totalApplicationsFromDailyCounts(streaks.dailyCounts),
    recentRows: recent.map(toApplicationRow),
    weekTotal,
  };
}

const STATS_CACHE_SECONDS = 300;

export function getDashboardSnapshot(userId: string, timezone: string) {
  const timeZone = timezone || "UTC";

  return unstable_cache(
    () => loadDashboardSnapshot(userId, timeZone),
    ["dashboard-snapshot", userId, timeZone],
    {
      revalidate: STATS_CACHE_SECONDS,
      tags: [applicationStatsTag(userId)],
    },
  )();
}
