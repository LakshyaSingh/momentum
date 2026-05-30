/**
 * Confidence-weighted layer merging.
 *
 * Each extractor produces a `RawLayer` (source + raw fields). This module:
 *   1. Computes a per-field confidence from a layer's base score and the
 *      candidate value's own characteristics.
 *   2. Validates each candidate (ATS-vendor block, plausibility, etc.).
 *   3. Picks the highest-confidence candidate per field, breaking ties by
 *      source priority.
 *   4. Boosts confidence when multiple sources agree on the same value.
 *
 * The output is a flat `ParsedJobFields` plus a diagnostics object so callers
 * can log which source supplied which field.
 */

import { normalizeCompanyNameForMatch } from "@/lib/company-lookup";
import {
  normalizeNotes,
  normalizeRecruiter,
} from "@/lib/job-link/field-validators";
import {
  type FieldKey,
  type LayerSource,
  type ParseDiagnostics,
  type RawLayer,
  type ScoredFields,
  type ScoredValue,
} from "@/lib/job-link/internal";
import {
  companyUrlAgreement,
  isMetaDescriptionLocation,
  validateCompany,
  validateLocation,
  validateRole,
  validateSalary,
} from "@/lib/job-link/validation";
import type { ParsedJobFields } from "@/lib/job-link/types";

/** Base confidence score for each layer source, on a 0..1 scale. */
const BASE_CONFIDENCE: Record<LayerSource, number> = {
  "ats:greenhouse": 0.95,
  "ats:lever": 0.95,
  "ats:ashby": 0.95,
  "ats:workday": 0.94,
  "ats:bamboohr": 0.93,
  "ats:smartrecruiters": 0.93,
  "ats:rippling": 0.95,
  "ats:linkedin": 0.85,
  "json-ld": 0.9,
  microdata: 0.82,
  "embedded-json": 0.78,
  "open-graph": 0.72,
  meta: 0.62,
  title: 0.55,
  dom: 0.6,
  url: 0.5,
  text: 0.4,
};

/** Source priority order used to break confidence ties. */
const SOURCE_PRIORITY: LayerSource[] = [
  "ats:greenhouse",
  "ats:lever",
  "ats:ashby",
  "ats:workday",
  "ats:bamboohr",
  "ats:smartrecruiters",
  "ats:rippling",
  "ats:linkedin",
  "json-ld",
  "microdata",
  "embedded-json",
  "open-graph",
  "meta",
  "dom",
  "title",
  "url",
  "text",
];

const PRIORITY_INDEX: Map<LayerSource, number> = new Map(
  SOURCE_PRIORITY.map((source, index) => [source, index]),
);

/** Per-field confidence adjustments based on the value itself. */
function adjustForFieldValue(
  field: FieldKey,
  rawValue: string,
  source: LayerSource,
  url: string | undefined,
): { value: string; confidence: number } | null {
  switch (field) {
    case "company": {
      const validated = validateCompany(rawValue);
      if (!validated) return null;
      const base = BASE_CONFIDENCE[source];
      const agreement = companyUrlAgreement(validated, url);
      // Pin the score to the [0, 1] band.
      return { value: validated, confidence: Math.min(1, base * agreement) };
    }
    case "role": {
      // Validate without company context first; the merger applies a second
      // pass with the picked company once both fields are known.
      const validated = validateRole(rawValue, {});
      if (!validated) return null;
      let confidence = BASE_CONFIDENCE[source];
      // Penalize obviously brand-suffixed roles (e.g. "Apply now | Acme").
      if (/\bapply\s+now\b/i.test(validated)) confidence *= 0.7;
      // Boost roles with both seniority + craft keywords (likely real titles).
      if (/(senior|staff|principal|lead|junior|associate)\b/i.test(validated)) confidence += 0.02;
      if (/(engineer|manager|designer|analyst|scientist|developer|architect|director|recruiter|coordinator|specialist|consultant|writer|marketer|technician)\b/i.test(validated)) {
        confidence += 0.02;
      }
      return { value: validated, confidence: Math.min(1, confidence) };
    }
    case "location": {
      const validated = validateLocation(rawValue);
      if (!validated) return null;
      let confidence = BASE_CONFIDENCE[source];
      // Boost city, ST or Remote/Hybrid/On-site.
      if (/\b[A-Z][a-z]+,\s*[A-Z]{2}\b/.test(validated)) confidence += 0.05;
      if (/^(remote|hybrid|on[- ]site)\b/i.test(validated)) confidence += 0.03;
      return { value: validated, confidence: Math.min(1, confidence) };
    }
    case "salary": {
      const validated = validateSalary(rawValue);
      if (!validated) return null;
      // Salary that originated in a structured layer (JSON-LD / ATS adapter)
      // gets near-1 confidence; text-derived salary stays at the base score.
      const confidence =
        source === "json-ld" || source.startsWith("ats:")
          ? Math.min(1, BASE_CONFIDENCE[source] + 0.05)
          : BASE_CONFIDENCE[source];
      return { value: validated, confidence };
    }
    case "recruiter": {
      const validated = normalizeRecruiter(rawValue);
      if (!validated) return null;
      return { value: validated, confidence: BASE_CONFIDENCE[source] };
    }
    case "notes": {
      const validated = normalizeNotes(rawValue, url);
      if (!validated) return null;
      return { value: validated, confidence: BASE_CONFIDENCE[source] };
    }
    default:
      return null;
  }
}

function priorityOf(source: LayerSource): number {
  return PRIORITY_INDEX.get(source) ?? PRIORITY_INDEX.size;
}

function pickBest(candidates: ScoredValue[]): ScoredValue | undefined {
  if (candidates.length === 0) return undefined;
  return candidates.sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    return priorityOf(a.source) - priorityOf(b.source);
  })[0];
}

/**
 * Boost the chosen candidate's confidence when other layers agreed on the
 * same normalized value. Used to lift agreement signal above a single
 * high-confidence layer.
 */
function applyAgreementBoost(
  field: FieldKey,
  chosen: ScoredValue,
  all: ScoredValue[],
): ScoredValue {
  if (all.length < 2) return chosen;
  const normalize = (value: string) =>
    field === "company" ? normalizeCompanyNameForMatch(value) : value.toLowerCase().trim();
  const target = normalize(chosen.value);
  const agreeing = all.filter((entry) => normalize(entry.value) === target);
  if (agreeing.length < 2) return chosen;

  const boosted = Math.min(1, chosen.confidence + 0.04 * (agreeing.length - 1));
  return { ...chosen, confidence: boosted };
}

/**
 * Merge layers into a single `ParsedJobFields` plus diagnostics.
 */
export function mergeLayersScored(
  layers: RawLayer[],
  url: string | undefined,
): { fields: ParsedJobFields; diagnostics: ParseDiagnostics } {
  const layersWithFields: LayerSource[] = [];
  const fieldCandidates: Record<FieldKey, ScoredValue[]> = {
    role: [],
    company: [],
    location: [],
    salary: [],
    recruiter: [],
    notes: [],
  };

  for (const layer of layers) {
    let layerContributed = false;
    for (const key of Object.keys(fieldCandidates) as FieldKey[]) {
      const raw = layer.fields[key];
      if (!raw) continue;
      const adjusted = adjustForFieldValue(key, raw, layer.source, url);
      if (!adjusted) continue;
      fieldCandidates[key].push({
        value: adjusted.value,
        source: layer.source,
        confidence: adjusted.confidence,
      });
      layerContributed = true;
    }
    if (layerContributed) layersWithFields.push(layer.source);
  }

  const scored: ScoredFields = {};
  for (const key of Object.keys(fieldCandidates) as FieldKey[]) {
    const chosen = pickBest(fieldCandidates[key]);
    if (!chosen) continue;
    scored[key] = applyAgreementBoost(key, chosen, fieldCandidates[key]);
  }

  // Second pass: re-validate role given the chosen company (drops role==company).
  if (scored.role && scored.company) {
    const revalidated = validateRole(scored.role.value, { company: scored.company.value });
    if (!revalidated) {
      delete scored.role;
    }
  }

  const fields: ParsedJobFields = {
    role: scored.role?.value,
    company: scored.company?.value,
    location: scored.location?.value,
    salary: scored.salary?.value,
    recruiter: scored.recruiter?.value,
    notes: scored.notes?.value,
    hiringOrgUrl: layers
      .map((layer) => layer.fields.hiringOrgUrl)
      .find((value): value is string => typeof value === "string" && value.trim().length > 0),
  };

  const diagnostics: ParseDiagnostics = {
    platform: null, // filled by the orchestrator
    url: url ?? "",
    layersTried: layers.map((layer) => layer.source),
    layersWithFields,
    fieldSources: Object.fromEntries(
      (Object.keys(scored) as FieldKey[]).map((key) => [key, scored[key]!.source]),
    ) as ParseDiagnostics["fieldSources"],
    fieldConfidence: Object.fromEntries(
      (Object.keys(scored) as FieldKey[]).map((key) => [key, scored[key]!.confidence]),
    ) as ParseDiagnostics["fieldConfidence"],
    warnings: [],
    durationMs: 0,
  };

  return { fields, diagnostics };
}

export { isMetaDescriptionLocation, BASE_CONFIDENCE };
