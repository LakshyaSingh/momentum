import { prisma } from "@/lib/prisma";
import { isoDateKeyInTimezone } from "@/lib/utils";

/** Validate IANA timezone strings before using them in SQL. */
export function safeTimezone(timezone: string | undefined): string {
  const tz = timezone?.trim() || "UTC";
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return tz;
  } catch {
    return "UTC";
  }
}

type DailyCountRow = { day: string; count: number };

/**
 * Aggregate application counts by calendar day in the user's timezone.
 * Returns far less data than loading every application row.
 */
export async function loadDailyCounts(
  userId: string,
  timezone: string,
): Promise<Record<string, number>> {
  const timeZone = safeTimezone(timezone);

  const rows = await prisma.$queryRaw<DailyCountRow[]>`
    SELECT
      to_char(
        ("applicationDate" AT TIME ZONE 'UTC') AT TIME ZONE ${timeZone},
        'YYYY-MM-DD'
      ) AS day,
      COUNT(*)::int AS count
    FROM applications
    WHERE "userId" = ${userId}
    GROUP BY 1
  `;

  const dailyCounts: Record<string, number> = {};
  for (const row of rows) {
    dailyCounts[row.day] = row.count;
  }
  return dailyCounts;
}

/** Fallback for environments where raw SQL grouping differs from JS date keys. */
export async function loadDailyCountsFromApplications(
  userId: string,
  timezone: string,
): Promise<Record<string, number>> {
  const timeZone = safeTimezone(timezone);
  const apps = await prisma.application.findMany({
    where: { userId },
    select: { applicationDate: true },
  });

  const dailyCounts: Record<string, number> = {};
  for (const app of apps) {
    const key = isoDateKeyInTimezone(app.applicationDate, timeZone);
    dailyCounts[key] = (dailyCounts[key] ?? 0) + 1;
  }
  return dailyCounts;
}

export function totalApplicationsFromDailyCounts(dailyCounts: Record<string, number>) {
  return Object.values(dailyCounts).reduce((sum, count) => sum + count, 0);
}
