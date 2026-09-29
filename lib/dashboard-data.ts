import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  applicationStatsTag,
  type StreakInfo,
  streakInfoFromDailyCounts,
  weekSeriesFromDailyCounts,
} from "@/lib/streak";
import {
  loadDailyCounts,
  loadDailyCountsFromApplications,
  totalApplicationsFromDailyCounts,
} from "@/lib/application-stats";
import type { ApplicationRow } from "@/components/applications/data-table";
import { toApplicationRow } from "@/lib/applications-list";

export type DashboardSnapshot = {
  streaks: StreakInfo;
  totalAll: number;
  recentRows: ApplicationRow[];
  weekTotal: number;
};

/**
 * The cached part holds only data that does not depend on the date. Today's
 * count, the streak and the week total are derived per request below: a copy
 * that baked them in would keep showing yesterday as today for up to two cache
 * lifetimes after midnight (the first read past expiry still serves the stale
 * entry while it refreshes in the background).
 */
type DashboardData = {
  dailyCounts: Record<string, number>;
  recentRows: ApplicationRow[];
};

async function loadDashboardData(userId: string, timeZone: string): Promise<DashboardData> {
  // Read daily counts directly rather than through the cached streak helpers:
  // nesting one `unstable_cache` inside another is unsupported in Next.js, and
  // the inner entry would keep its own lifetime, so a tag revalidation could
  // refresh this snapshot while the inner counts stayed stale.
  const [dailyCounts, recent] = await Promise.all([
    loadDailyCounts(userId, timeZone).catch((error) => {
      console.error("loadDailyCounts SQL failed, falling back", error);
      return loadDailyCountsFromApplications(userId, timeZone);
    }),
    prisma.application.findMany({
      where: { userId },
      orderBy: { applicationDate: "desc" },
      take: 6,
    }),
  ]);

  return { dailyCounts, recentRows: recent.map(toApplicationRow) };
}

const STATS_CACHE_SECONDS = 300;

export async function getDashboardSnapshot(
  userId: string,
  timezone: string,
): Promise<DashboardSnapshot> {
  const timeZone = timezone || "UTC";

  const { dailyCounts, recentRows } = await unstable_cache(
    () => loadDashboardData(userId, timeZone),
    ["dashboard-data", userId, timeZone],
    {
      revalidate: STATS_CACHE_SECONDS,
      tags: [applicationStatsTag(userId)],
    },
  )();

  const weekTotal = weekSeriesFromDailyCounts(dailyCounts, timeZone, 7).reduce(
    (sum, day) => sum + day.count,
    0,
  );

  return {
    streaks: streakInfoFromDailyCounts(dailyCounts, timeZone),
    totalAll: totalApplicationsFromDailyCounts(dailyCounts),
    recentRows,
    weekTotal,
  };
}
