/**
 * URL canonicalization for embedded ATS widgets.
 *
 * Many companies embed an Ashby or Greenhouse widget on their own domain
 * with the job ID in a query string (e.g. `govwell.com/careers?ashby_jid=…`).
 * When the user pastes that link, naive fetching returns the parent careers
 * page (often a JS-rendered shell that lists many jobs or shows a default
 * one) instead of the specific posting they want.
 *
 * This module detects those known embed patterns and rewrites the URL to
 * the canonical ATS host so the dedicated adapter can extract the right job.
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NUMERIC_ID_REGEX = /^\d{4,}$/;

/**
 * If `url` is a known embedded ATS widget URL, return the canonical ATS URL.
 * Otherwise return the input unchanged.
 *
 * Currently handled:
 *   - `ashby_jid=<uuid>` (Ashby) → `https://jobs.ashbyhq.com/<orgSlug>/<jobId>`
 *   - `gh_jid=<number>` (Greenhouse) → `https://job-boards.greenhouse.io/<orgSlug>/jobs/<jobId>`
 *
 * The org slug is derived from the hostname (`govwell.com` → `govwell`),
 * with `www.` stripped. This works for the common case where the embed
 * was set up by the company that owns the careers page.
 */
export function canonicalizeJobUrl(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }

  // Skip if already on a known ATS host — the existing adapter will handle it.
  if (isAlreadyOnAtsHost(parsed.hostname)) return url;

  const ashbyJid = parsed.searchParams.get("ashby_jid");
  if (ashbyJid && UUID_REGEX.test(ashbyJid)) {
    const slug = orgSlugFromHostname(parsed.hostname);
    if (slug) return `https://jobs.ashbyhq.com/${slug}/${ashbyJid}`;
  }

  const ghJid = parsed.searchParams.get("gh_jid");
  if (ghJid && NUMERIC_ID_REGEX.test(ghJid)) {
    const slug = orgSlugFromHostname(parsed.hostname);
    if (slug) return `https://job-boards.greenhouse.io/${slug}/jobs/${ghJid}`;
  }

  return url;
}

function isAlreadyOnAtsHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  return (
    /(^|\.)ashbyhq\.com$/.test(lower) ||
    /(^|\.)greenhouse\.io$/.test(lower) ||
    /(^|\.)lever\.co$/.test(lower) ||
    /(^|\.)bamboohr\.com$/.test(lower) ||
    /myworkdayjobs\.com$/.test(lower) ||
    /smartrecruiters\.com$/.test(lower) ||
    /(^|\.)ats\.rippling\.com$/.test(lower)
  );
}

const COMMON_SUBDOMAINS = new Set(["www", "careers", "jobs", "apply", "join"]);

/**
 * Derive the company's ATS org slug from its careers-page hostname.
 *
 * `govwell.com` → `govwell`
 * `www.acmecorp.com` → `acmecorp`
 * `careers.example.co` → `example`
 */
function orgSlugFromHostname(hostname: string): string | null {
  const parts = hostname.toLowerCase().split(".").filter(Boolean);
  if (parts.length < 2) return null;

  // Strip common subdomain prefixes
  const meaningful = COMMON_SUBDOMAINS.has(parts[0]!) ? parts.slice(1) : parts;
  const slug = meaningful[0];
  if (!slug || slug.length < 2) return null;
  return slug;
}
