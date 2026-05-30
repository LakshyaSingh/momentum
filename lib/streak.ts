import { cache } from "react";
import { unstable_cache } from "next/cache";
import {
  loadDailyCounts,
  loadDailyCountsFromApplications,
} from "@/lib/application-stats";
import {
  addCalendarDaysToKey,
  isoDateKeyInTimezone,
  lastNDaysInTimezone,
} from "@/lib/utils";

export type StreakInfo = {
  current: number;
  longest: number;
  appliedToday: number;
  dailyCounts: Record<string, number>;
};

export const STREAK_MILESTONES = [3, 7, 14, 30, 100] as const;
export type StreakMilestone = (typeof STREAK_MILESTONES)[number];

const STATS_CACHE_SECONDS = 300;

export function applicationStatsTag(userId: string) {
  return `application-stats-${userId}`;
}

/** Returns the highest milestone reached at exactly this streak count, else null. */
export function milestoneFor(streak: number): StreakMilestone | null {
  if (streak === 100) return 100;
  if (streak === 30) return 30;
  if (streak === 14) return 14;
  if (streak === 7) return 7;
  if (streak === 3) return 3;
  return null;
}

/**
 * Walk back day-by-day in the user's timezone from "today" and count consecutive
 * days that contain at least one application. The first gap (a day with zero
 * applications, allowing today itself to be empty) breaks the streak.
 */
export function computeCurrentStreak(
  appliedDateKeys: Set<string>,
  todayKey: string,
  timeZone: string,
): number {
  let streak = 0;
  let cursor = todayKey;

  if (!appliedDateKeys.has(cursor)) {
    cursor = addCalendarDaysToKey(cursor, -1, timeZone);
  }

  while (appliedDateKeys.has(cursor)) {
    streak += 1;
    cursor = addCalendarDaysToKey(cursor, -1, timeZone);
  }
  return streak;
}

export function computeLongestStreak(appliedDateKeys: Set<string>): number {
  if (appliedDateKeys.size === 0) return 0;
  const sorted = Array.from(appliedDateKeys)
    .map((k) => new Date(k + "T00:00:00"))
    .sort((a, b) => a.getTime() - b.getTime());

  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const cur = sorted[i]!;
    const diff = Math.round((cur.getTime() - prev.getTime()) / 86_400_000);
    if (diff === 1) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }
  return longest;
}

/** Build the daily count map (key = YYYY-MM-DD in the user's timezone). */
export function buildDailyCounts(
  applications: { applicationDate: Date }[],
  timeZone: string,
): Map<string, number> {
  const m = new Map<string, number>();
  for (const a of applications) {
    const k = isoDateKeyInTimezone(a.applicationDate, timeZone);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

async function fetchDailyCounts(userId: string, timeZone: string): Promise<Record<string, number>> {
  try {
    return await loadDailyCounts(userId, timeZone);
  } catch (error) {
    console.error("loadDailyCounts SQL failed, falling back", error);
    return loadDailyCountsFromApplications(userId, timeZone);
  }
}

function getCachedDailyCounts(userId: string, timeZone: string) {
  return unstable_cache(
    () => fetchDailyCounts(userId, timeZone),
    ["daily-application-counts", userId, timeZone],
    {
      revalidate: STATS_CACHE_SECONDS,
      tags: [applicationStatsTag(userId)],
    },
  )();
}

export function weekSeriesFromDailyCounts(
  dailyCounts: Record<string, number>,
  timeZone: string,
  days = 7,
) {
  const weekKeys = lastNDaysInTimezone(days, timeZone);
  return weekKeys.map((key) => ({
    date: new Date(`${key}T12:00:00.000Z`),
    count: dailyCounts[key] ?? 0,
    key,
  }));
}

function streakInfoFromDailyCounts(
  dailyCounts: Record<string, number>,
  timeZone: string,
): StreakInfo {
  const keys = new Set(Object.keys(dailyCounts));
  const todayKey = isoDateKeyInTimezone(new Date(), timeZone);

  return {
    current: computeCurrentStreak(keys, todayKey, timeZone),
    longest: computeLongestStreak(keys),
    appliedToday: dailyCounts[todayKey] ?? 0,
    dailyCounts,
  };
}

async function computeStreaksUncached(userId: string, timezone: string): Promise<StreakInfo> {
  const timeZone = timezone || "UTC";
  const dailyCounts = await fetchDailyCounts(userId, timeZone);
  return streakInfoFromDailyCounts(dailyCounts, timeZone);
}

export const computeStreaksForUser = cache(
  async (userId: string, timezone: string): Promise<StreakInfo> => {
    const timeZone = timezone || "UTC";
    const dailyCounts = await getCachedDailyCounts(userId, timeZone);
    return streakInfoFromDailyCounts(dailyCounts, timeZone);
  },
);

/** Uncached streak read for mutations in the same request. */
export { computeStreaksUncached };

export async function revalidateUserApplicationStats(userId: string) {
  const { revalidateTag } = await import("next/cache");
  revalidateTag(applicationStatsTag(userId));
}
