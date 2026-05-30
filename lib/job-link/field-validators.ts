import type { ParsedJobFields } from "@/lib/job-link/types";

const RECRUITER_STOP_PHRASES =
  /learn more|click here|contact us|see more|show more|view profile|sign in|apply now/i;

const LOCATION_STOP_PHRASES =
  /^(clear text|see more|show more|learn more|view all|edit location|add location|location|locations|city)$/i;

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

function cleanCandidate(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

const SALARY_NOISE =
  /million|billion|per month|\/month|one[- ]time|stipend|total investment|valuation|raised|funding round|home-office|relocation allowance|series [a-d]/i;

const MIN_ANNUAL_SALARY = 20_000;

function salaryAmountValues(trimmed: string): number[] {
  const values: number[] = [];

  for (const match of trimmed.matchAll(/\$\s?([\d,]+(?:\.\d+)?)(\s*[kK])?\b/g)) {
    const num = Number.parseFloat(match[1]!.replace(/,/g, ""));
    if (!Number.isFinite(num) || num <= 0) continue;
    values.push(Math.round(match[2] ? num * 1000 : num));
  }

  return values;
}

export function isUsefulSalary(value: string | undefined): boolean {
  if (!value) return false;

  const trimmed = value.trim();
  if (!trimmed) return false;

  if (/^(USD|CAD|GBP|EUR|AUD|NZD|SGD|INR|CHF|JPY)$/i.test(trimmed)) return false;
  if (SALARY_NOISE.test(trimmed)) return false;

  const amounts = salaryAmountValues(trimmed);
  if (amounts.length === 0) {
    const numbers =
      trimmed.match(/\d[\d,]*/g)?.map((part) => Number.parseInt(part.replace(/,/g, ""), 10)) ?? [];
    if (numbers.length === 0) return false;
    if (numbers.every((amount) => amount === 0)) return false;
    if (!numbers.some((amount) => amount >= MIN_ANNUAL_SALARY) && !/\d\s*[kK]\b/.test(trimmed)) {
      return false;
    }
  } else if (!amounts.some((amount) => amount >= MIN_ANNUAL_SALARY)) {
    return false;
  }

  if (/^[$£€]?\s*0(?:\s*[-–—to]+\s*[$£€]?\s*0)?(?:\s|$|\/)/i.test(trimmed)) return false;

  return true;
}

export function isLikelyLocation(value: string | undefined): boolean {
  if (!value) return false;

  const trimmed = value.trim();
  if (trimmed.length < 2 || trimmed.length > 120) return false;
  if (LOCATION_STOP_PHRASES.test(trimmed)) return false;
  if (/^(click|edit|view|clear)$/i.test(trimmed)) return false;

  return true;
}

export function isLikelyCityStateLocation(value: string | undefined): boolean {
  if (!value || !isLikelyLocation(value)) return false;

  const trimmed = value.trim();
  return /^[A-Z][a-zA-Z .'-]+(?:[,'\s-][A-Za-z .'-]+)*,\s*[A-Z]{2}(?:,\s*(?:USA|United States))?$/.test(
    trimmed,
  );
}

export function isLikelyMetaLocation(value: string | undefined): boolean {
  if (!value || !isLikelyLocation(value)) return false;
  if (isLikelyCityStateLocation(value)) return true;

  const trimmed = value.trim();
  if (/^(remote|hybrid|on[- ]site)\b/i.test(trimmed)) return true;

  return (
    trimmed.length <= 80 &&
    /^[A-Za-z][A-Za-z0-9 .,'()\-–—]+(\s*[-–—]\s*[A-Za-z0-9 .,'()\-–—]+)+$/.test(trimmed) &&
    !isLikelyJobPostingDescription(trimmed)
  );
}

export function isLikelyJobPostingDescription(value: string | undefined): boolean {
  if (!value) return false;

  const trimmed = value.trim();
  if (trimmed.length > 180) return true;
  if (/^(the position|about the role|job description|our roster has an opening)/i.test(trimmed)) {
    return true;
  }
  if (
    trimmed.length > 80 &&
    /(responsible for|requirements include|qualifications|what you'll do|we are looking for)/i.test(
      trimmed,
    )
  ) {
    return true;
  }

  return false;
}

/** Fix numbers broken across lines, e.g. "$129, 250" -> "$129,250". */
export function repairSplitNumberCommas(value: string): string {
  return value.replace(/(\d),(?:\s+)(\d{3}\b)/g, "$1,$2");
}

export function isLikelyRecruiterName(value: string | undefined): boolean {
  if (!value) return false;

  const trimmed = value.trim().replace(/[.,!?]+$/, "");
  if (trimmed.length < 3 || trimmed.length > 40) return false;
  if (RECRUITER_STOP_PHRASES.test(trimmed)) return false;

  const words = trimmed.split(/\s+/);
  const stopwords = new Set([
    "to",
    "learn",
    "more",
    "click",
    "see",
    "view",
    "your",
    "the",
    "our",
    "a",
    "an",
    "for",
    "at",
    "us",
    "me",
    "team",
    "here",
    "now",
    "apply",
    "with",
  ]);

  if (words.some((word) => stopwords.has(word.toLowerCase()))) return false;

  if (/^[A-Z][a-z]+(?:[ \-'][A-Z][a-z.]+)+$/.test(trimmed)) return true;
  if (/^[A-Z][a-z]{2,}$/.test(trimmed)) return true;

  return false;
}

export function cleanJobNotes(value: string | undefined, url?: string): string | undefined {
  if (!value) return undefined;

  let cleaned = value.trim();
  const isLinkedIn = url ? /linkedin\.com/i.test(url) : /linkedin/i.test(cleaned);

  if (isLinkedIn) {
    cleaned = cleaned
      .replace(/^Posted\s+[\d:]+\s*(?:AM|PM)?\.?\s*/i, "")
      .replace(/…\s*See this and similar jobs on LinkedIn\.?$/i, "")
      .replace(/See this and similar jobs on LinkedIn\.?$/i, "")
      .trim();
  }

  cleaned = cleaned
    .replace(/([a-z0-9)])(Compensation|Requirements|Responsibilities|Qualifications|About the job):/gi, "$1 $2:")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length < 20) return undefined;
  if (/^posted\s+[\d:]/i.test(cleaned) && cleaned.length < 80) return undefined;
  if (/flags the job requisition|testing purposes|filter(ed)? out of reports/i.test(cleaned)) {
    return undefined;
  }
  if (isLikelyJobPostingDescription(cleaned)) return undefined;

  return truncate(cleaned, 2000);
}

function parseSalaryAmountToken(raw: string): number | undefined {
  const token = raw.trim().replace(/\/\s*yr$/i, "").trim();
  const cleaned = token.replace(/^[$£€]\s*/, "").trim();

  const kMatch = cleaned.match(/^([\d,]+(?:\.\d+)?)\s*([kK])$/);
  if (kMatch) {
    const num = Number.parseFloat(kMatch[1]!.replace(/,/g, ""));
    if (Number.isFinite(num) && num > 0) return Math.round(num * 1000);
  }

  const numeric = Number.parseFloat(cleaned.replace(/,/g, ""));
  if (!Number.isFinite(numeric) || numeric <= 0) return undefined;

  return Math.round(numeric);
}

function formatSalaryAmount(raw: string): string {
  const numeric = parseSalaryAmountToken(raw);
  if (numeric === undefined) return raw.replace(/\s+/g, " ").trim();
  return `$${numeric.toLocaleString("en-US")}`;
}

function normalizeSalaryDisplay(value: string): string {
  value = repairSplitNumberCommas(value);

  const salaryRangeIntro = value.match(
    /(?:salary range for this position is|salary range)[:\s]+(\$[\d,]+(?:\.\d+)?(?:\s*[kK])?(?:\s*\/\s*yr)?\s*[-–—]\s*\$[\d,]+(?:\.\d+)?(?:\s*[kK])?(?:\s*\/\s*yr)?)/i,
  );
  if (salaryRangeIntro?.[1]) {
    value = salaryRangeIntro[1];
  }

  const basePayRange = value.match(
    /base pay range\s+(\$[\d,]+(?:\.\d+)?(?:\s*[kK])?(?:\s*\/\s*yr)?\s*[-–—]\s*\$[\d,]+(?:\.\d+)?(?:\s*[kK])?(?:\s*\/\s*yr)?)/i,
  );
  if (basePayRange?.[1]) {
    value = basePayRange[1];
  }

  const rangeMatch = value.match(
    /(\$[\d,]+(?:\.\d+)?(?:\s*[kK])?(?:\s*\/\s*yr)?)\s*[-–—]\s*(\$[\d,]+(?:\.\d+)?(?:\s*[kK])?(?:\s*\/\s*yr)?)/i,
  );
  if (rangeMatch) {
    return `${formatSalaryAmount(rangeMatch[1]!)}–${formatSalaryAmount(rangeMatch[2]!)}`;
  }

  const singleMatch = value.match(/\$[\d,]+(?:\.\d+)?(?:\s*[kK])?(?:\s*\/\s*yr)?/i);
  if (singleMatch) {
    return formatSalaryAmount(singleMatch[0]);
  }

  return value.replace(/\s+/g, " ").trim();
}

export function normalizeSalary(value: string | undefined): string | undefined {
  if (!value || !isUsefulSalary(value)) return undefined;
  return truncate(normalizeSalaryDisplay(value.trim()), 80);
}

export function normalizeLocation(value: string | undefined): string | undefined {
  if (!isLikelyLocation(value)) return undefined;
  return truncate(value!.trim(), 120);
}

export function normalizeRecruiter(value: string | undefined): string | undefined {
  if (!isLikelyRecruiterName(value)) return undefined;
  return truncate(value!.trim().replace(/[.,!?]+$/, ""), 120);
}

export function normalizeNotes(value: string | undefined, url?: string): string | undefined {
  return cleanJobNotes(value, url);
}

export function sanitizeParsedFields(
  fields: ParsedJobFields,
  url: string,
  titleFallback?: ParsedJobFields,
): ParsedJobFields {
  const fallback = titleFallback ?? {};

  return {
    role: fields.role,
    company: fields.company,
    location:
      normalizeLocation(fields.location) ??
      normalizeLocation(fallback.location),
    salary: normalizeSalary(fields.salary),
    recruiter: normalizeRecruiter(fields.recruiter),
    notes: normalizeNotes(fields.notes, url),
  };
}

export function firstLikelyRecruiterName(candidates: Array<string | undefined>): string | undefined {
  for (const candidate of candidates) {
    const normalized = normalizeRecruiter(cleanCandidate(candidate));
    if (normalized) return normalized;
  }
  return undefined;
}
