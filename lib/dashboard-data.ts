import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  applicationStatsTag,
  computeStreaksUncached,
  type StreakInfo,
  weekSeriesFromDailyCounts,
} from "@/lib/streak";
import { totalApplicationsFromDailyCounts } from "@/lib/application-stats";
import type { ApplicationRow } from "@/components/applications/data-table";
import { toApplicationRow } from "@/lib/applications-list";

export type DashboardSnapshot = {
  streaks: StreakInfo;
  totalAll: number;
  recentRows: ApplicationRow[];
  weekTotal: number;
};

async function loadDashboardSnapshot(
  userId: string,
  timezone: string,
): Promise<DashboardSnapshot> {
  const timeZone = timezone || "UTC";
  // Use the *uncached* streak read here. `loadDashboardSnapshot` is already
  // wrapped in `unstable_cache` below with the same TTL and revalidation tag,
  // and nesting one `unstable_cache` inside another is unsupported in Next.js:
  // the inner entry keeps its own lifetime, so a tag revalidation can refresh
  // the outer snapshot while the inner streak data stays stale (the dashboard
  // then shows zeros or pre-import numbers even though the DB is correct).
  const [streaks, recent] = await Promise.all([
    computeStreaksUncached(userId, timeZone),
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
