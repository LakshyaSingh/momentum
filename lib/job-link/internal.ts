/**
 * Internal types used by the parser pipeline.
 *
 * The public output type is `ParsedJobFields` (see `./types.ts`) with six string
 * fields (role, company, location, salary, recruiter, notes). Internally we
 * carry per-field source + confidence + structured representations (e.g.
 * salary as min/max/currency/interval) and flatten back to the public shape
 * at the orchestrator boundary.
 */

import type { ParsedJobFields } from "@/lib/job-link/types";

export const FIELD_KEYS = [
  "role",
  "company",
  "location",
  "salary",
  "recruiter",
  "notes",
] as const;

export type FieldKey = (typeof FIELD_KEYS)[number];

/**
 * Where a candidate value came from. ATS-specific adapters use the
 * `ats:<platform>` namespace so they sort to the top of the priority list
 * (they understand platform-specific DOM and JSON shapes).
 */
export type LayerSource =
  | "ats:greenhouse"
  | "ats:lever"
  | "ats:ashby"
  | "ats:workday"
  | "ats:bamboohr"
  | "ats:smartrecruiters"
  | "ats:rippling"
  | "ats:linkedin"
  | "json-ld"
  | "embedded-json"
  | "microdata"
  | "open-graph"
  | "meta"
  | "title"
  | "dom"
  | "url"
  | "text";

export type ScoredValue<T = string> = {
  value: T;
  source: LayerSource;
  confidence: number; // 0..1
};

export type ScoredFields = Partial<Record<FieldKey, ScoredValue>>;

/** A raw extractor output (no confidence yet). */
export type RawLayer = {
  source: LayerSource;
  fields: Partial<ParsedJobFields>;
};

/** Structured salary representation parsed from text or JSON-LD. */
export type StructuredSalary = {
  min: number | null;
  max: number | null;
  currency: string; // ISO-like code (USD/EUR/GBP/...)
  interval: "yearly" | "monthly" | "weekly" | "daily" | "hourly";
  /** Display string formatted from the structure ($120,000–$150,000/yr). */
  display: string;
};

/** Structured error codes returned to the API route + client. */
export type FetchErrorCode =
  | "invalid_url"
  | "blocked_url"
  | "blocked"
  | "rate_limited"
  | "not_found"
  | "expired"
  | "captcha"
  | "timeout"
  | "too_large"
  | "wrong_content_type"
  | "network";

export class JobParseError extends Error {
  readonly code: FetchErrorCode;
  readonly status?: number;

  constructor(code: FetchErrorCode, message: string, status?: number) {
    super(message);
    this.name = "JobParseError";
    this.code = code;
    this.status = status;
  }
}

/** Diagnostics emitted by the orchestrator (logged internally; not in API response). */
export type ParseDiagnostics = {
  platform: string | null;
  url: string;
  layersTried: LayerSource[];
  layersWithFields: LayerSource[];
  fieldSources: Partial<Record<FieldKey, LayerSource>>;
  fieldConfidence: Partial<Record<FieldKey, number>>;
  warnings: string[];
  durationMs: number;
};
