/** Returns true when `tz` is a valid IANA timezone name. */
export function isValidIanaTimezone(tz: string): boolean {
  if (!tz || tz.length > 64) return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Read the browser's IANA timezone (client-only). Returns null outside a browser. */
export function getBrowserTimezone(): string | null {
  if (typeof Intl === "undefined" || typeof Intl.DateTimeFormat !== "function") {
    return null;
  }
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return isValidIanaTimezone(tz) ? tz : null;
}

/** Default timezone for new accounts before browser detection runs. */
export const DEFAULT_TIMEZONE = "UTC";

/** Local hour (0–23) for an instant in the given IANA timezone. */
export function hourInTimezone(date: Date, timeZone: string): number {
  const hour = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    hour12: false,
  }).format(date);
  return parseInt(hour, 10) % 24;
}

/** Time-of-day greeting based on the user's IANA timezone, not server time. */
export function greetingForTimezone(timeZone: string, now = new Date()): string {
  const h = hourInTimezone(now, timeZone);
  if (h < 5) return "Burning the midnight oil";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Late night grind";
}
