/**
 * Structured salary parser.
 *
 * Pipeline:
 *   raw text  →  parseSalary()  →  StructuredSalary | null
 *   StructuredSalary  →  formatSalaryDisplay()  →  human-readable display string
 *
 * The structured shape is used internally for plausibility checks
 * (e.g. "is this within a sane band for a yearly salary?") before the
 * orchestrator collapses it back to the `ParsedJobFields.salary` string.
 */

import type { StructuredSalary } from "@/lib/job-link/internal";
import { repairSplitNumberCommas } from "@/lib/job-link/field-validators";

const CURRENCY_SYMBOLS: Record<string, string> = {
  $: "USD",
  "£": "GBP",
  "€": "EUR",
  "¥": "JPY",
  "₹": "INR",
};

const CURRENCY_CODES = new Set([
  "USD",
  "CAD",
  "AUD",
  "NZD",
  "SGD",
  "INR",
  "EUR",
  "GBP",
  "JPY",
  "CHF",
  "MXN",
  "BRL",
]);

const PLAUSIBLE_BANDS: Record<StructuredSalary["interval"], { min: number; max: number }> = {
  yearly: { min: 20_000, max: 2_000_000 },
  monthly: { min: 1_500, max: 200_000 },
  weekly: { min: 400, max: 50_000 },
  daily: { min: 80, max: 10_000 },
  hourly: { min: 10, max: 2_000 },
};

/**
 * Patterns whose presence within 80 chars of a candidate range strongly
 * suggests the numbers are NOT compensation (funding rounds, valuations,
 * stipends, etc.).
 *
 * Deliberately excludes "equity", "stock", "bonus", "401k", "benefits" —
 * those often appear alongside real comp ("$120K + equity", "401(k) match")
 * and the plausibility band already catches absurd amounts.
 */
const NOISE_PATTERN =
  /\b(million|billion|raised|funding(?:\s+round)?|investment|series\s+[a-d]|valuation|stipend|one[- ]time|relocation|signing(?:\s+bonus)?|sign[- ]on)\b/i;

const RANGE_SEPARATORS = "(?:to|through|[-–—]|[~]|[/])";

const INTERVAL_PATTERNS: Array<{ regex: RegExp; interval: StructuredSalary["interval"] }> = [
  { regex: /\b(?:per\s+hour|\/\s*hr|\/\s*hour|hourly|an\s+hour)\b/i, interval: "hourly" },
  { regex: /\b(?:per\s+day|\/\s*day|daily|a\s+day)\b/i, interval: "daily" },
  { regex: /\b(?:per\s+week|\/\s*week|weekly|a\s+week)\b/i, interval: "weekly" },
  { regex: /\b(?:per\s+month|\/\s*mo(?:nth)?|monthly|a\s+month)\b/i, interval: "monthly" },
  { regex: /\b(?:per\s+(?:year|annum)|\/\s*yr|\/\s*year|annually|a\s+year|yearly|p\.?a\.?)\b/i, interval: "yearly" },
];

function detectInterval(text: string): StructuredSalary["interval"] {
  for (const { regex, interval } of INTERVAL_PATTERNS) {
    if (regex.test(text)) return interval;
  }
  return "yearly";
}

function detectCurrency(text: string): string {
  const symbolMatch = text.match(/[$£€¥₹]/);
  if (symbolMatch) {
    const symbol = symbolMatch[0];
    if (symbol in CURRENCY_SYMBOLS) return CURRENCY_SYMBOLS[symbol]!;
  }

  const codeMatch = text.match(/\b(USD|CAD|AUD|NZD|SGD|INR|EUR|GBP|JPY|CHF|MXN|BRL)\b/i);
  if (codeMatch?.[1]) return codeMatch[1].toUpperCase();

  return "USD";
}

/** Parse a salary amount token like "$120,000", "120k", "120K/yr", "120000". */
function parseAmount(token: string): number | null {
  const cleaned = token
    .trim()
    .replace(/[$£€¥₹]/g, "")
    .replace(/\b(USD|CAD|AUD|NZD|SGD|INR|EUR|GBP|JPY|CHF|MXN|BRL)\b/gi, "")
    .replace(/\/\s*(?:yr|year|mo|month|wk|week|day|hr|hour)\b/gi, "")
    .replace(/,/g, "")
    .replace(/\s+/g, "")
    .trim();

  const kMatch = cleaned.match(/^([\d.]+)\s*[kK]$/);
  if (kMatch) {
    const num = Number.parseFloat(kMatch[1]!);
    return Number.isFinite(num) && num > 0 ? Math.round(num * 1000) : null;
  }

  const mMatch = cleaned.match(/^([\d.]+)\s*[mM]$/);
  if (mMatch) {
    const num = Number.parseFloat(mMatch[1]!);
    return Number.isFinite(num) && num > 0 ? Math.round(num * 1_000_000) : null;
  }

  const num = Number.parseFloat(cleaned);
  return Number.isFinite(num) && num > 0 ? Math.round(num) : null;
}

/** Convert an amount + interval suffix on the token (like "$120K/yr") if present. */
function detectIntervalOnToken(token: string): StructuredSalary["interval"] | null {
  const m = token.match(/\/\s*(yr|year|mo|month|wk|week|day|hr|hour)\b/i);
  if (!m) return null;
  const suffix = m[1]!.toLowerCase();
  if (suffix.startsWith("yr") || suffix === "year") return "yearly";
  if (suffix.startsWith("mo")) return "monthly";
  if (suffix.startsWith("wk") || suffix === "week") return "weekly";
  if (suffix === "day") return "daily";
  return "hourly";
}

function isPlausible(salary: StructuredSalary): boolean {
  const band = PLAUSIBLE_BANDS[salary.interval];
  const min = salary.min ?? salary.max ?? 0;
  const max = salary.max ?? salary.min ?? 0;
  if (min <= 0 || max <= 0) return false;
  if (min > max) return false;
  if (min < band.min) return false;
  if (max > band.max) return false;
  // Reject "ranges" where max is more than 10x min (likely scraped noise).
  if (max / Math.max(min, 1) > 10) return false;
  return true;
}

function isNoiseContext(text: string, matchStart: number, matchLength: number): boolean {
  const start = Math.max(0, matchStart - 80);
  const end = matchStart + matchLength + 80;
  const window = text.slice(start, end);
  return NOISE_PATTERN.test(window);
}

const NUMBER_TOKEN = "[$£€¥₹]?\\s?\\d{1,3}(?:[,.\\s]?\\d{3})*(?:\\.\\d+)?\\s?[kKmM]?(?:\\s?\\/\\s?(?:yr|year|mo|month|wk|week|day|hr|hour))?";

/**
 * Extract a structured salary from a text blob.
 * Returns `null` if the text doesn't contain a plausible compensation figure.
 */
export function parseSalary(input: string | undefined): StructuredSalary | null {
  if (!input) return null;

  const text = repairSplitNumberCommas(input);
  const rangeRegex = new RegExp(
    `(${NUMBER_TOKEN})\\s*${RANGE_SEPARATORS}\\s*(${NUMBER_TOKEN})`,
    "gi",
  );

  const candidates: StructuredSalary[] = [];

  let match: RegExpExecArray | null;
  while ((match = rangeRegex.exec(text)) !== null) {
    if (isNoiseContext(text, match.index, match[0].length)) continue;

    const leftToken = match[1]!;
    const rightToken = match[2]!;
    const min = parseAmount(leftToken);
    const max = parseAmount(rightToken);
    if (min === null || max === null) continue;
    if (min <= 0 || max <= 0) continue;
    if (min === max) continue;

    const contextStart = Math.max(0, match.index - 50);
    const contextEnd = match.index + match[0].length + 50;
    const context = text.slice(contextStart, contextEnd);
    const interval = detectIntervalOnToken(rightToken) ?? detectIntervalOnToken(leftToken) ?? detectInterval(context);
    const currency = detectCurrency(`${leftToken} ${rightToken} ${context}`);

    const [lo, hi] = min <= max ? [min, max] : [max, min];
    const salary: StructuredSalary = {
      min: lo,
      max: hi,
      currency,
      interval,
      display: "",
    };
    salary.display = formatSalaryDisplay(salary);
    if (isPlausible(salary)) candidates.push(salary);
  }

  if (candidates.length > 0) {
    return pickBestRange(candidates);
  }

  // Fallback: single-value salary like "Pay: $120,000/yr"
  const singleRegex = new RegExp(`(${NUMBER_TOKEN})`, "gi");
  while ((match = singleRegex.exec(text)) !== null) {
    if (isNoiseContext(text, match.index, match[0].length)) continue;

    const token = match[1]!;
    const amount = parseAmount(token);
    if (amount === null) continue;

    const contextStart = Math.max(0, match.index - 80);
    const contextEnd = match.index + match[0].length + 80;
    const context = text.slice(contextStart, contextEnd);
    if (!/(salary|compensation|pay|base\s+pay|wage)\b/i.test(context)) continue;

    const interval = detectIntervalOnToken(token) ?? detectInterval(context);
    const currency = detectCurrency(`${token} ${context}`);

    const salary: StructuredSalary = {
      min: amount,
      max: amount,
      currency,
      interval,
      display: "",
    };
    salary.display = formatSalaryDisplay(salary);
    if (isPlausible(salary)) return salary;
  }

  return null;
}

function pickBestRange(candidates: StructuredSalary[]): StructuredSalary {
  return candidates.sort((a, b) => {
    const scoreA = (a.max ?? 0) - (a.min ?? 0);
    const scoreB = (b.max ?? 0) - (b.min ?? 0);
    return scoreB - scoreA;
  })[0]!;
}

const CURRENCY_PREFIX: Record<string, string> = {
  USD: "$",
  CAD: "CA$",
  AUD: "A$",
  NZD: "NZ$",
  SGD: "S$",
  INR: "₹",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  CHF: "CHF ",
  MXN: "MX$",
  BRL: "R$",
};

const INTERVAL_SUFFIX: Record<StructuredSalary["interval"], string> = {
  yearly: "/yr",
  monthly: "/mo",
  weekly: "/wk",
  daily: "/day",
  hourly: "/hr",
};

function formatAmount(amount: number, currency: string): string {
  const prefix = CURRENCY_PREFIX[currency] ?? `${currency} `;
  return `${prefix}${amount.toLocaleString("en-US")}`;
}

/** Format a structured salary into a single display string. */
export function formatSalaryDisplay(salary: StructuredSalary): string {
  const { min, max, currency, interval } = salary;
  const suffix = interval === "yearly" ? "" : INTERVAL_SUFFIX[interval];

  if (min !== null && max !== null && min !== max) {
    return `${formatAmount(min, currency)}–${formatAmount(max, currency)}${suffix}`;
  }
  const single = max ?? min ?? 0;
  return `${formatAmount(single, currency)}${suffix}`;
}

/**
 * Build a StructuredSalary from JSON-LD `baseSalary.value` shape if possible.
 * Handles both QuantitativeValue with minValue/maxValue and plain numeric values.
 */
export function structuredSalaryFromJsonLd(node: unknown): StructuredSalary | null {
  if (!node || typeof node !== "object") return null;
  const root = node as Record<string, unknown>;

  const currency = typeof root.currency === "string" ? root.currency.toUpperCase() : "USD";
  if (currency.length === 3 && !CURRENCY_CODES.has(currency) && !/^[A-Z]{3}$/.test(currency)) {
    return null;
  }

  const unitRaw = typeof root.unitText === "string" ? root.unitText.toLowerCase() : null;
  const interval = unitTextToInterval(unitRaw);

  let value = root.value;

  if (typeof value === "number") {
    if (value <= 0) return null;
    const adjusted = adjustForUnit(value, interval);
    const salary: StructuredSalary = {
      min: adjusted,
      max: adjusted,
      currency,
      interval,
      display: "",
    };
    salary.display = formatSalaryDisplay(salary);
    return isPlausible(salary) ? salary : null;
  }

  if (Array.isArray(value)) {
    value = value[0];
  }

  if (!value || typeof value !== "object") return null;

  const range = value as Record<string, unknown>;
  const innerUnitRaw =
    typeof range.unitText === "string" ? range.unitText.toLowerCase() : unitRaw;
  const innerInterval = unitTextToInterval(innerUnitRaw) ?? interval;

  const rawMin = typeof range.minValue === "number" ? range.minValue : null;
  const rawMax = typeof range.maxValue === "number" ? range.maxValue : null;
  const rawValue = typeof range.value === "number" ? range.value : null;

  let min = rawMin ?? rawValue;
  let max = rawMax ?? rawValue;
  if (min === null && max === null) return null;
  if (min !== null) min = adjustForUnit(min, innerInterval);
  if (max !== null) max = adjustForUnit(max, innerInterval);

  if ((min ?? 0) <= 0 && (max ?? 0) <= 0) return null;

  const salary: StructuredSalary = {
    min: min ?? max,
    max: max ?? min,
    currency,
    interval: innerInterval,
    display: "",
  };
  salary.display = formatSalaryDisplay(salary);
  return isPlausible(salary) ? salary : null;
}

function unitTextToInterval(unit: string | null | undefined): StructuredSalary["interval"] {
  if (!unit) return "yearly";
  if (/^hour/i.test(unit) || unit === "hour") return "hourly";
  if (/^day/i.test(unit) || unit === "day") return "daily";
  if (/^week/i.test(unit) || unit === "week") return "weekly";
  if (/^month/i.test(unit) || unit === "month") return "monthly";
  return "yearly";
}

/**
 * Some JSON-LD postings give a yearly amount that is mistakenly entered as
 * the monthly equivalent (e.g. 12000 for "yearly" when they meant 12000/mo).
 * We don't try to fix that automatically — but we DO multiply tiny "yearly"
 * values that look like they're really thousands (e.g. 120 → 120000) when
 * the unit text confirms yearly. Otherwise we leave the value as-is.
 */
function adjustForUnit(amount: number, interval: StructuredSalary["interval"]): number {
  if (interval !== "yearly") return Math.round(amount);
  if (amount > 0 && amount < 1000) return Math.round(amount * 1000);
  return Math.round(amount);
}
