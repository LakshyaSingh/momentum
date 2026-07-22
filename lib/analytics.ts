import type { Application, ApplicationStatus, StatusEvent } from "@prisma/client";
import { isoDateKey } from "@/lib/utils";

export type TimeRange = "7d" | "30d" | "6mo" | "1yr" | "all";

export const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "6mo", label: "6mo" },
  { value: "1yr", label: "1yr" },
  { value: "all", label: "All" },
];

export type Bucket = "day" | "week" | "month";

export function bucketFor(range: TimeRange): Bucket {
  switch (range) {
    case "7d":
    case "30d":
      return "day";
    case "6mo":
      return "week";
    case "1yr":
      return "month";
    case "all":
      return "month";
  }
}

export function rangeStart(range: TimeRange, now = new Date()): Date | null {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  switch (range) {
    case "7d":
      d.setDate(d.getDate() - 6);
      return d;
    case "30d":
      d.setDate(d.getDate() - 29);
      return d;
    case "6mo":
      d.setMonth(d.getMonth() - 6);
      return d;
    case "1yr":
      d.setFullYear(d.getFullYear() - 1);
      return d;
    case "all":
      return null;
  }
}

function bucketKey(date: Date, bucket: Bucket): string {
  if (bucket === "day") return isoDateKey(date);
  if (bucket === "week") {
    // ISO week: Monday-anchored
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - day);
    return isoDateKey(d);
  }
  // month
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function bucketLabel(key: string, bucket: Bucket): string {
  if (bucket === "day") {
    const d = new Date(key + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  if (bucket === "week") {
    const d = new Date(key + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  const [y, m] = key.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

export interface SeriesPoint {
  key: string;
  label: string;
  count: number;
  date: Date;
}

export function buildSeries(
  applications: { applicationDate: Date }[],
  range: TimeRange,
  now = new Date(),
): SeriesPoint[] {
  const bucket = bucketFor(range);
  const start = rangeStart(range, now);

  const filtered = start
    ? applications.filter((a) => a.applicationDate >= start)
    : applications;

  // Pre-build all bucket keys in the range so empty days still render.
  const keys: string[] = [];
  if (start) {
    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);
    while (cursor <= now) {
      keys.push(bucketKey(cursor, bucket));
      if (bucket === "day") cursor.setDate(cursor.getDate() + 1);
      else if (bucket === "week") cursor.setDate(cursor.getDate() + 7);
      else cursor.setMonth(cursor.getMonth() + 1);
    }
  } else if (filtered.length > 0) {
    // 'all' range — span min..max
    const earliest = filtered.reduce(
      (m, a) => (a.applicationDate < m ? a.applicationDate : m),
      filtered[0]!.applicationDate,
    );
    const cursor = new Date(earliest);
    cursor.setHours(0, 0, 0, 0);
    while (cursor <= now) {
      keys.push(bucketKey(cursor, bucket));
      if (bucket === "day") cursor.setDate(cursor.getDate() + 1);
      else if (bucket === "week") cursor.setDate(cursor.getDate() + 7);
      else cursor.setMonth(cursor.getMonth() + 1);
    }
  }

  const counts = new Map<string, number>();
  for (const a of filtered) {
    const k = bucketKey(a.applicationDate, bucket);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }

  // Dedup keys (months can repeat in the all-range cursor walk)
  const uniq = Array.from(new Set(keys));
  return uniq.map((k) => {
    let date: Date;
    if (bucket === "month") {
      const [y, m] = k.split("-");
      date = new Date(Number(y), Number(m) - 1, 1);
    } else {
      date = new Date(k + "T00:00:00");
    }
    return { key: k, label: bucketLabel(k, bucket), count: counts.get(k) ?? 0, date };
  });
}

/** Count applications by status. Returns every status key, zero-filled. */
export function statusBreakdown(
  applications: { status: ApplicationStatus }[],
): Record<ApplicationStatus, number> {
  const counts = {
    APPLIED: 0,
    OA: 0,
    RECRUITER_SCREEN: 0,
    INTERVIEW: 0,
    FINAL_ROUND: 0,
    OFFER: 0,
    REJECTED: 0,
    GHOSTED: 0,
    WITHDRAWN: 0,
  } as Record<ApplicationStatus, number>;
  for (const a of applications) counts[a.status] += 1;
  return counts;
}

export function topCompanies(
  applications: { company: string; status: ApplicationStatus }[],
  limit = 8,
) {
  const map = new Map<string, { total: number; positive: number }>();
  for (const a of applications) {
    const e = map.get(a.company) ?? { total: 0, positive: 0 };
    e.total += 1;
    if (
      a.status === "INTERVIEW" ||
      a.status === "FINAL_ROUND" ||
      a.status === "OFFER" ||
      a.status === "RECRUITER_SCREEN"
    ) {
      e.positive += 1;
    }
    map.set(a.company, e);
  }
  return Array.from(map.entries())
    .map(([company, stats]) => ({
      company,
      total: stats.total,
      positive: stats.positive,
      rate: stats.total > 0 ? stats.positive / stats.total : 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

export interface FunnelStage {
  key: string;
  label: string;
  count: number;
}

export function buildFunnel(
  applications: (Application & { events: StatusEvent[] })[],
): FunnelStage[] {
  let applied = 0;
  let response = 0;
  let interview = 0;
  let final = 0;
  let offer = 0;

  for (const app of applications) {
    applied += 1;
    const seen = new Set<ApplicationStatus>();
    for (const e of app.events) seen.add(e.status);
    // Response = anything beyond APPLIED, or responseReceived flag
    if (
      app.responseReceived ||
      seen.has("OA") || seen.has("RECRUITER_SCREEN") ||
      seen.has("INTERVIEW") || seen.has("FINAL_ROUND") ||
      seen.has("OFFER") || seen.has("REJECTED")
    ) {
      response += 1;
    }
    if (seen.has("INTERVIEW") || seen.has("FINAL_ROUND") || seen.has("OFFER")) interview += 1;
    if (seen.has("FINAL_ROUND") || seen.has("OFFER")) final += 1;
    if (seen.has("OFFER")) offer += 1;
  }

  return [
    { key: "applied", label: "Applied", count: applied },
    { key: "response", label: "Responses", count: response },
    { key: "interview", label: "Interviews", count: interview },
    { key: "final", label: "Final rounds", count: final },
    { key: "offer", label: "Offers", count: offer },
  ];
}

export interface ProductivityStats {
  total: number;
  bestDay: { date: Date; count: number } | null;
  avgPerWeek: number;
  longestStreak: number;
  mostActiveMonth: { key: string; label: string; count: number } | null;
  responseRate: number;
  interviewRate: number;
}

export function buildProductivity(
  applications: (Application & { events: StatusEvent[] })[],
  longestStreak: number,
): ProductivityStats {
  if (applications.length === 0) {
    return {
      total: 0,
      bestDay: null,
      avgPerWeek: 0,
      longestStreak,
      mostActiveMonth: null,
      responseRate: 0,
      interviewRate: 0,
    };
  }

  const byDay = new Map<string, number>();
  const byMonth = new Map<string, number>();
  for (const a of applications) {
    const dk = isoDateKey(a.applicationDate);
    byDay.set(dk, (byDay.get(dk) ?? 0) + 1);
    const mk = `${a.applicationDate.getFullYear()}-${String(a.applicationDate.getMonth() + 1).padStart(2, "0")}`;
    byMonth.set(mk, (byMonth.get(mk) ?? 0) + 1);
  }

  const bestDay = Array.from(byDay.entries()).reduce<{ date: Date; count: number } | null>(
    (m, [k, c]) => (m && m.count >= c ? m : { date: new Date(k + "T00:00:00"), count: c }),
    null,
  );
  const mostActiveMonth = Array.from(byMonth.entries()).reduce<
    { key: string; label: string; count: number } | null
  >(
    (m, [k, c]) =>
      m && m.count >= c
        ? m
        : { key: k, label: bucketLabel(k, "month"), count: c },
    null,
  );

  const earliest = applications.reduce(
    (m, a) => (a.applicationDate < m ? a.applicationDate : m),
    applications[0]!.applicationDate,
  );
  const weeks = Math.max(1, (Date.now() - earliest.getTime()) / (7 * 86_400_000));
  const avgPerWeek = applications.length / weeks;

  const responses = applications.filter(
    (a) =>
      a.responseReceived ||
      a.events.some((e) =>
        ["OA", "RECRUITER_SCREEN", "INTERVIEW", "FINAL_ROUND", "OFFER", "REJECTED"].includes(e.status),
      ),
  ).length;
  const interviews = applications.filter((a) =>
    a.events.some((e) => ["INTERVIEW", "FINAL_ROUND", "OFFER"].includes(e.status)),
  ).length;

  return {
    total: applications.length,
    bestDay,
    avgPerWeek,
    longestStreak,
    mostActiveMonth,
    responseRate: responses / applications.length,
    interviewRate: interviews / applications.length,
  };
}
