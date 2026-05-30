/**
 * Cross-field validators used by the scoring pipeline.
 *
 * These guards run AFTER each layer produces raw fields and BEFORE the
 * confidence-weighted merge. A guard either returns the value unchanged or
 * returns `null` to mean "this layer should not contribute this field".
 *
 * Examples of cases handled here:
 *   - Greenhouse pages should never report `company = "Greenhouse"`.
 *   - A Workday page's `<title>` is often the literal string "Careers" — we
 *     drop generic titles instead of letting them win the role field.
 *   - A salary string that doesn't normalize to a plausible structured value
 *     is dropped.
 *   - A company that disagrees with the URL host (and isn't a known brand
 *     mapping) gets a confidence penalty.
 */

import { domainFromJobLink } from "@/lib/company-logo";
import { normalizeCompanyNameForMatch } from "@/lib/company-lookup";
import { parseSalary } from "@/lib/job-link/salary";
import {
  isLikelyJobPostingDescription,
  isLikelyLocation,
  isLikelyMetaLocation,
} from "@/lib/job-link/field-validators";

/**
 * Names of ATS vendors and other generic identifiers that should never end up
 * in the "company" field. Tested case-insensitively against the normalized
 * candidate.
 */
export const ATS_VENDOR_NAMES = new Set(
  [
    "greenhouse",
    "greenhouse software",
    "lever",
    "ashby",
    "ashbyhq",
    "workday",
    "bamboohr",
    "bamboo hr",
    "smartrecruiters",
    "smart recruiters",
    "rippling",
    "ripplingats",
    "linkedin",
    "indeed",
    "glassdoor",
    "ziprecruiter",
    "monster",
    "wellfound",
    "angellist",
    "builtin",
    "built in",
    "jobvite",
    "icims",
    "taleo",
    "successfactors",
    "sap successfactors",
    "oracle careers",
    "oracle hcm",
    "myworkdayjobs",
    "myworkday",
    "lifeattiktok",
    "join the team",
    "careers",
    "career",
    "jobs",
    "job board",
    "all jobs",
    "apply",
    "apply now",
    "we're hiring",
    "we are hiring",
    "hiring",
  ].map((name) => normalizeCompanyNameForMatch(name)),
);

/**
 * Strings that look like a page-chrome title rather than a job role.
 * Anything matching this gets confidence dropped to 0 for the role field.
 */
const GENERIC_ROLE_PHRASES = new Set([
  "careers",
  "career",
  "jobs",
  "job openings",
  "open positions",
  "current openings",
  "open roles",
  "open jobs",
  "all jobs",
  "search jobs",
  "join us",
  "join the team",
  "join our team",
  "we are hiring",
  "apply",
  "apply now",
  "home",
  "login",
  "sign in",
  "job details",
  "job description",
  "position details",
]);

const GENERIC_LOCATION_PHRASES = new Set([
  "location",
  "locations",
  "city",
  "select location",
  "all locations",
  "any location",
  "multiple locations",
  "tbd",
  "to be determined",
]);

function lower(value: string): string {
  return value.trim().toLowerCase();
}

function normalize(value: string): string {
  return normalizeCompanyNameForMatch(value);
}

/** Is this string an ATS vendor name (or other generic identifier)? */
export function isAtsVendorName(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = normalize(value);
  if (!normalized) return false;
  return ATS_VENDOR_NAMES.has(normalized);
}

/**
 * Validate a company candidate. Returns the value unchanged when it looks
 * plausible, or `null` to drop the candidate entirely.
 */
export function validateCompany(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (trimmed.length < 2 || trimmed.length > 120) return null;
  if (/^https?:\/\//i.test(trimmed)) return null;
  if (/@/.test(trimmed)) return null;
  if (isAtsVendorName(trimmed)) return null;
  if (/^(home|search|filter|sort|menu|menu open|view all|see all)$/i.test(trimmed)) return null;
  // Pure numeric / requisition IDs aren't company names.
  if (/^\d+$/.test(trimmed)) return null;
  return trimmed;
}

/**
 * Validate a role candidate. Drops generic chrome titles.
 */
export function validateRole(
  value: string | undefined,
  context: { company?: string },
): string | null {
  if (!value) return null;
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (trimmed.length < 2 || trimmed.length > 200) return null;
  if (GENERIC_ROLE_PHRASES.has(lower(trimmed))) return null;

  // Reject any title that LEADS with a chrome word followed by a separator
  // ("Careers - Acme", "Jobs | OpenAI", "Apply Now — Stripe").
  if (
    /^(careers?|jobs?|hiring|apply(?:\s+now)?|open\s+roles?|open\s+positions?|open\s+jobs?|all\s+jobs|job\s+openings?|job\s+board)\b\s*(?:[-|\u2013\u2014:·\/]|$)/i.test(
      trimmed,
    )
  ) {
    return null;
  }

  // If the "role" is literally just the company name, reject it.
  if (context.company && normalize(context.company) === normalize(trimmed)) {
    return null;
  }

  if (isAtsVendorName(trimmed)) return null;
  return trimmed;
}

/**
 * Validate a location candidate. Keeps city/state, remote/hybrid/onsite,
 * and well-formed multi-part strings; drops everything else.
 */
export function validateLocation(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!isLikelyLocation(trimmed)) return null;
  if (GENERIC_LOCATION_PHRASES.has(lower(trimmed))) return null;
  // Drop strings that read like a job description rather than a place.
  if (isLikelyJobPostingDescription(trimmed)) return null;
  return trimmed;
}

/**
 * Decide whether a meta-description value should be treated as a location.
 * Wraps the existing `isLikelyMetaLocation` helper for consistency.
 */
export function isMetaDescriptionLocation(value: string | undefined): boolean {
  return isLikelyMetaLocation(value);
}

/**
 * Validate a salary candidate by attempting to parse it into a structured
 * salary. Returns the original cleaned text if it's plausible compensation,
 * otherwise `null`.
 *
 * The structured representation is computed for filtering only; the orchestrator
 * still flows the formatted display string into the public output.
 */
export function validateSalary(value: string | undefined): string | null {
  if (!value) return null;
  const parsed = parseSalary(value);
  if (!parsed) return null;
  return parsed.display;
}

/**
 * Confidence multiplier (0..1) for a company candidate based on whether it
 * matches the URL host. A matching candidate gets a small boost; a mismatched
 * candidate gets a small penalty. Unknown URL → 1 (no signal).
 */
export function companyUrlAgreement(
  candidate: string,
  url: string | undefined,
): number {
  if (!url) return 1;
  const expectedDomain = domainFromJobLink(url);
  if (!expectedDomain) return 1;

  const expectedSlug = expectedDomain.split(".")[0]!;
  const candidateNormalized = normalize(candidate).replace(/\s+/g, "");
  const expectedNormalized = normalize(expectedSlug).replace(/\s+/g, "");

  if (!candidateNormalized || !expectedNormalized) return 1;
  if (candidateNormalized === expectedNormalized) return 1.1;
  if (candidateNormalized.includes(expectedNormalized) || expectedNormalized.includes(candidateNormalized)) {
    return 1.05;
  }
  return 0.92;
}
