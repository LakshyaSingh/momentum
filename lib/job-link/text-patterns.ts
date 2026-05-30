import { cleanText } from "@/lib/job-link/text-utils";
import {
  isLikelyCityStateLocation,
  isLikelyLocation,
  isLikelyRecruiterName,
  isUsefulSalary,
  repairSplitNumberCommas,
} from "@/lib/job-link/field-validators";

const CITY_STATE_PATTERN =
  /\b([A-Z][a-zA-Z]+(?:[ .'-][A-Z][a-zA-Z]+)*,\s*[A-Z]{2})(?=\s|[,.;]|$|[A-Z][a-z]{2,})/g;

const REMOTE_NEGATION =
  /remote[- ]only|not\s+(?:a\s+)?(?:fit|open|available)|no\s+remote|non[- ]remote|not\s+remote/i;

function extractCityStateLocations(text: string): string[] {
  const matches: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = CITY_STATE_PATTERN.exec(text)) !== null) {
    const candidate = cleanText(match[1]);
    if (candidate && isLikelyCityStateLocation(candidate)) {
      matches.push(candidate);
    }
  }

  return matches;
}

function extractWorkArrangement(text: string): string | undefined {
  const patterns: Array<{ regex: RegExp; label: string }> = [
    { regex: /\b(hybrid)\b/i, label: "Hybrid" },
    { regex: /\b(on[- ]site)\b/i, label: "On-site" },
    { regex: /\b(work from home)\b/i, label: "Remote" },
    { regex: /\b(remote)\b/i, label: "Remote" },
  ];

  for (const { regex, label } of patterns) {
    const global = new RegExp(regex.source, `${regex.flags}g`);
    let match: RegExpExecArray | null;

    while ((match = global.exec(text)) !== null) {
      const start = match.index ?? 0;
      const context = text.slice(Math.max(0, start - 30), start + match[0].length + 50);
      if (REMOTE_NEGATION.test(context)) continue;
      return label;
    }
  }

  return undefined;
}

const SALARY_PATTERNS = [
  /\$\s?\d{1,3}(?:,\d{3})*(?:\.\d+)?\s?(?:k|K)?(?:\s?[-–—to]+\s?\$?\s?\d{1,3}(?:,\d{3})*(?:\.\d+)?\s?(?:k|K)?)?(?:\s?(?:per year|\/yr|\/year|annually|a year))?/g,
  /£\s?\d{1,3}(?:,\d{3})+(?:\s?[-–—to]+\s?£?\s?\d{1,3}(?:,\d{3})+)?(?:\s?(?:per year|\/yr|annually))?/g,
  /€\s?\d{1,3}(?:[.,]\d{3})+(?:\s?[-–—to]+\s?€?\s?\d{1,3}(?:[.,]\d{3})+)?/g,
  /(?:USD|CAD|AUD|NZD|SGD|INR|EUR|GBP)\s?\d{1,3}(?:,\d{3})+(?:\s?[-–—to]+\s?(?:USD|CAD|AUD|NZD|SGD|INR|EUR|GBP)?\s?\d{1,3}(?:,\d{3})+)?/gi,
  /\d{1,3}(?:,\d{3})+\s?(?:USD|CAD|AUD|NZD|SGD|INR|EUR|GBP)(?:\s?[-–—to]+\s?\d{1,3}(?:,\d{3})+\s?(?:USD|CAD|AUD|NZD|SGD|INR|EUR|GBP)?)?/gi,
  /(?:salary|compensation|pay range|base pay)[:\s]+([^.!\n]{8,80})/gi,
];

function scoreSalaryCandidate(value: string): number {
  let score = 0;
  if (/\$|£|€|USD|GBP|EUR|CAD|salary|compensation/i.test(value)) score += 3;
  if (/\d/.test(value)) score += 2;

  const amounts = value.match(/\d[\d,]*/g) ?? [];
  if (amounts.length >= 2) score += 5;
  if (amounts.length === 1) score -= 2;

  if (/-|\u2013|\u2014|to/i.test(value)) score += 2;
  if (value.length >= 8 && value.length <= 60) score += 1;
  if (/benefits|stock|bonus|401k|health|provided pay range|talk with your recruiter/i.test(value)) {
    score -= 4;
  }
  if (/million|billion|per month|one[- ]time|stipend|investment|valuation|raised/i.test(value)) {
    score -= 8;
  }
  if (/\.00\/yr/i.test(value) && amounts.length < 2) score -= 2;

  return score;
}

export function extractSalaryFromText(text: string | undefined): string | undefined {
  if (!text) return undefined;

  const prepared = repairSplitNumberCommas(text);
  const candidates: string[] = [];

  for (const pattern of SALARY_PATTERNS) {
    const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
    const globalPattern = new RegExp(pattern.source, flags);
    let match: RegExpExecArray | null;

    while ((match = globalPattern.exec(prepared)) !== null) {
      const matched = match[0];
      const end = (match.index ?? 0) + matched.length;
      const after = prepared.slice(end, end + 24);
      if (/^\s*(million|billion|bn)\b/i.test(after)) continue;

      const raw = cleanText(match[1] ?? matched);
      if (raw) candidates.push(raw);
    }
  }

  if (candidates.length === 0) return undefined;

  candidates.sort((a, b) => scoreSalaryCandidate(b) - scoreSalaryCandidate(a));
  const best = candidates.find((candidate) => isUsefulSalary(candidate));
  return best;
}

export function extractLocationFromText(text: string | undefined): string | undefined {
  if (!text) return undefined;

  const cityStates = extractCityStateLocations(text);
  if (cityStates.length > 0) {
    const counts = new Map<string, number>();
    for (const location of cityStates) {
      counts.set(location, (counts.get(location) ?? 0) + 1);
    }

    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]![0];
  }

  const headquartersMatch = text.match(/\bheadquartered in ([A-Z][a-zA-Z .'-]+)/i);
  if (headquartersMatch?.[1]) {
    const hq = cleanText(headquartersMatch[1]);
    if (hq && isLikelyLocation(hq)) return hq;
  }

  return extractWorkArrangement(text);
}

export function extractRecruiterFromText(text: string | undefined): string | undefined {
  if (!text) return undefined;

  const patterns = [
    /(?:recruiter|hiring manager|talent partner|contact)[:\s]+([A-Z][a-z]+(?:[ \-'][A-Z][a-z.]+){0,2})/g,
    /(?:reach out to|contact)\s+([A-Z][a-z]+(?:[ \-'][A-Z][a-z.]+){0,2})/g,
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const name = cleanText(match[1]);
      if (name && isLikelyRecruiterName(name)) return name;
    }
  }

  return undefined;
}
