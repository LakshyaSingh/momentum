import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined, opts?: Intl.DateTimeFormatOptions) {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...opts,
  }).format(d);
}

export function formatRelative(date: Date | string | null | undefined) {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return formatDate(d);
}

export function startOfDayLocal(date: Date, _tz?: string): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isoDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Calendar date (YYYY-MM-DD) for an instant in a specific IANA timezone. */
export function isoDateKeyInTimezone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Step a YYYY-MM-DD key forward/back by whole calendar days in a timezone. */
export function addCalendarDaysToKey(key: string, delta: number, timeZone: string): string {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  const utc = new Date(Date.UTC(y, m - 1, d + delta, 12, 0, 0));
  return isoDateKeyInTimezone(utc, timeZone);
}

/** Last N calendar days ending today, oldest first, in the given timezone. */
export function lastNDaysInTimezone(n: number, timeZone: string): string[] {
  const today = isoDateKeyInTimezone(new Date(), timeZone);
  return Array.from({ length: n }, (_, i) => addCalendarDaysToKey(today, i - (n - 1), timeZone));
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
