import { unstable_cache } from "next/cache";
import {
  domainFromCompanyName,
  domainFromJobLink,
  isValidCompanyDomain,
  normalizeCompanyDomain,
  resolveCompanyDomainCandidates,
} from "@/lib/company-logo";

export type ClearbitSuggestion = {
  name: string;
  domain: string;
  logo: string | null;
};

const CLEARBIT_SUGGEST_URL = "https://autocomplete.clearbit.com/v1/companies/suggest";
const LOOKUP_CACHE_SECONDS = 60 * 60 * 24 * 30;
const MIN_CONFIDENT_SCORE = 85;
const SHORT_QUERY_MAX_LENGTH = 5;

const CORPORATE_SUFFIXES =
  /\b(incorporated|inc|llc|l\.l\.c|corp|corporation|company|co|ltd|limited|group|holdings|plc|gmbh|sa|ag|bv|lp|llp)\b/gi;

export function normalizeCompanyNameForMatch(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/['’.]/g, "")
    .replace(CORPORATE_SUFFIXES, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSet(value: string): Set<string> {
  return new Set(
    normalizeCompanyNameForMatch(value)
      .split(" ")
      .filter((token) => token.length > 1),
  );
}

export function scoreClearbitSuggestion(company: string, suggestion: ClearbitSuggestion): number {
  const query = normalizeCompanyNameForMatch(company);
  const name = normalizeCompanyNameForMatch(suggestion.name);
  if (!query || !name) return 0;

  if (query === name) return 100;

  const queryTokens = tokenSet(company);
  const nameTokens = tokenSet(suggestion.name);
  let overlap = 0;
  for (const token of queryTokens) {
    if (nameTokens.has(token)) overlap += 1;
  }

  if (overlap === 0 || queryTokens.size === 0 || nameTokens.size === 0) return 0;

  const coverage = overlap / queryTokens.size; // how much of the query the name covers
  const precision = overlap / nameTokens.size; // how much of the name the query covers

  /*
   * Containment is the ordinary real-world case, and scoring it with
   * `min(coverage, precision)` treated it as a near-miss: "Highmark Health"
   * against Clearbit's "Highmark" scored 75 against an 85 threshold, so a
   * correct domain was thrown away and the row fell back to initials. That is
   * the single biggest reason a domain has to be typed by hand.
   *
   * The two directions are not equally trustworthy, so they score apart:
   *
   *   name ⊆ query — "Highmark" for "Highmark Health". The suggestion is the
   *   broader entity, normally the parent brand that actually owns the domain.
   *   Accept it.
   *
   *   query ⊆ name — "Cartesia Education" for "Cartesia". The suggestion is
   *   *more specific* than what was asked for, and is often a different company
   *   that merely shares a word. Score it below the accept threshold so it can
   *   place as a runner-up but never win on its own.
   */
  if (precision === 1) return 90;
  if (coverage === 1) return 80;

  return 60 + Math.round(Math.min(coverage, precision) * 30);
}

function clearbitScoreThreshold(company: string): number {
  const query = normalizeCompanyNameForMatch(company);
  if (query.length <= SHORT_QUERY_MAX_LENGTH) return 100;
  return MIN_CONFIDENT_SCORE;
}

export function pickBestClearbitSuggestion(
  company: string,
  suggestions: ClearbitSuggestion[],
): ClearbitSuggestion | undefined {
  if (suggestions.length === 0) return undefined;

  let best: ClearbitSuggestion | undefined;
  let bestScore = 0;

  for (const suggestion of suggestions) {
    if (!isValidCompanyDomain(suggestion.domain)) continue;

    const score = scoreClearbitSuggestion(company, suggestion);
    if (score > bestScore) {
      best = suggestion;
      bestScore = score;
    }
  }

  return bestScore >= clearbitScoreThreshold(company) ? best : undefined;
}

async function fetchClearbitSuggestions(company: string): Promise<ClearbitSuggestion[]> {
  const query = company.trim();
  if (query.length < 2) return [];

  const url = `${CLEARBIT_SUGGEST_URL}?query=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (compatible; MomentumJobTracker/1.0; +https://job-tracker-alpha-blush.vercel.app)",
      },
      next: { revalidate: LOOKUP_CACHE_SECONDS },
    });

    if (!response.ok) return [];

    const data = (await response.json()) as ClearbitSuggestion[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function lookupConfidentCompanyDomainFromName(
  company: string,
): Promise<string | undefined> {
  const trimmed = company.trim();
  if (!trimmed) return undefined;

  const suggestions = await fetchClearbitSuggestions(trimmed);
  const best = pickBestClearbitSuggestion(trimmed, suggestions);
  return best ? normalizeCompanyDomain(best.domain) : undefined;
}

function cachedLookupKey(company: string, jobLink?: string | null): string[] {
  return [
    "company-domain-lookup-v3",
    normalizeCompanyNameForMatch(company),
    jobLink?.trim().toLowerCase() ?? "",
  ];
}

export async function resolveCompanyDomainAsync(
  company: string,
  jobLink?: string | null,
): Promise<string | undefined> {
  const fromLink = domainFromJobLink(jobLink);
  if (fromLink) return fromLink;

  const trimmed = company.trim();
  if (!trimmed) return undefined;

  /*
   * Confident lookups only. `lookupCompanyDomainFromName` falls back to
   * `domainFromCompanyName`, which turns any unmatched name into
   * `<slug>.com` — precisely the weak guess the logo rules forbid, and worse
   * here than elsewhere because this value gets *persisted* on the row. An
   * unresolved company must fall back to initials, not to a plausible-looking
   * domain that belongs to someone else.
   */
  return unstable_cache(
    () => lookupConfidentCompanyDomainFromName(trimmed),
    cachedLookupKey(trimmed, jobLink),
    { revalidate: LOOKUP_CACHE_SECONDS },
  )();
}

/**
 * Resolve the company domain to persist on an application row.
 *
 * Order matters. An explicit value always wins — including `""`, which means
 * "the user cleared this, show initials" and must never be re-inferred over.
 * Then the offline candidates (job-link host, known-brand map), which are free.
 * Only when those come up empty do we pay for the network lookup, which is
 * cached for 30 days per company name.
 *
 * That last step is what takes the domain field off the user's hands. Most
 * postings live on an ATS host (jobs.ashbyhq.com/<tenant>/…), and an unknown
 * tenant slug is deliberately never turned into `<tenant>.com`, so until now
 * the offline path had no answer for them and the domain had to be typed.
 *
 * Callers must await this outside any database transaction — it can make a
 * network request, and holding a transaction open across one is not acceptable.
 */
export async function resolvePersistedCompanyDomain(data: {
  company?: string;
  companyDomain?: string;
  jobLink?: string;
}): Promise<string | undefined> {
  if (data.companyDomain !== undefined) return data.companyDomain;

  const offline = resolveCompanyDomainCandidates({
    company: data.company,
    jobLink: data.jobLink,
  })[0];
  if (offline) return offline;

  if (!data.company?.trim()) return undefined;
  return resolveCompanyDomainAsync(data.company, data.jobLink);
}
