/**
 * Client-safe helpers for the job-link UI.
 *
 * Kept out of `lib/job-link/` on purpose: that directory's entry points pull in
 * cheerio and the ATS adapters, which must never reach the browser bundle.
 */

export function looksLikeHttpUrl(value: string): boolean {
  return /^https?:\/\/.+/i.test(value.trim());
}

/**
 * Coerce an unknown (possibly non-string) value into a safe toast message.
 * Server error responses are not guaranteed to be strings — e.g. an
 * unexpected 500 body or a structured error object — and passing a non-string
 * to sonner's toast renders it as a React child, throwing React error #31
 * ("Objects are not valid as a React child") and white-screening the app.
 */
export function asMessage(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}
