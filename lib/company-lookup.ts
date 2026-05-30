import { unstable_cache } from "next/cache";
import {
  domainFromCompanyName,
  domainFromJobLink,
  isValidCompanyDomain,
  normalizeCompanyDomain,
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

  if (overlap > 0 && queryTokens.size > 0) {
    const coverage = overlap / queryTokens.size;
    const precision = overlap / nameTokens.size;
    return 60 + Math.round(Math.min(coverage, precision) * 30);
  }

  return 0;
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

export async function lookupCompanyDomainFromName(company: string): Promise<string | undefined> {
  const trimmed = company.trim();
  if (!trimmed) return undefined;

  const suggestions = await fetchClearbitSuggestions(trimmed);
  const best = pickBestClearbitSuggestion(trimmed, suggestions);
  if (best) return normalizeCompanyDomain(best.domain);

  return domainFromCompanyName(trimmed);
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
    "company-domain-lookup-v2",
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

  return unstable_cache(
    () => lookupCompanyDomainFromName(trimmed),
    cachedLookupKey(trimmed, jobLink),
    { revalidate: LOOKUP_CACHE_SECONDS },
  )();
}
