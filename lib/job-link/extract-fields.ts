import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import { findAdapter, platformLabel } from "@/lib/job-link/adapters";
import { canonicalizeJobUrl } from "@/lib/job-link/canonicalize";
import { extractDomFields, extractMetaFields, extractMicrodataFields } from "@/lib/job-link/dom-meta";
import {
  isLikelyJobPostingDescription,
  isLikelyMetaLocation,
} from "@/lib/job-link/field-validators";
import {
  JobParseError,
  type FieldKey,
  type LayerSource,
  type ParseDiagnostics,
  type RawLayer,
} from "@/lib/job-link/internal";
import { extractEmbeddedJsonFields, extractJsonLdFields } from "@/lib/job-link/json-ld";
import { mergeLayersScored } from "@/lib/job-link/scoring";
import {
  extractLocationFromText,
  extractRecruiterFromText,
  extractSalaryFromText,
} from "@/lib/job-link/text-patterns";
import { parseTitleTag } from "@/lib/job-link/text-utils";
import type { ParseJobResult, ParseJobSource, ParsedJobFields } from "@/lib/job-link/types";
import { extractUrlFields } from "@/lib/job-link/url-heuristics";

/**
 * Public re-export of the source enum value for the API route. The set of
 * `LayerSource` strings is a superset; we collapse ATS-specific sources to
 * `"ats:<platform>"` style here so the client only sees the broader category.
 */
function publicSource(source: LayerSource): ParseJobSource {
  if (source.startsWith("ats:")) {
    if (source === "ats:rippling") return "rippling";
    if (source === "ats:linkedin") return "linkedin";
    return "dom";
  }
  return source as ParseJobSource;
}

/**
 * Build the ordered list of raw layers for a fetched HTML document.
 *
 * Layer order doesn't matter for value selection (the scoring merge sorts
 * by confidence), but it does control the order in the diagnostics object.
 */
function buildLayers(html: string, url: string, $: CheerioAPI): RawLayer[] {
  const layers: RawLayer[] = [];
  let parsedUrl: URL | null = null;
  try {
    parsedUrl = new URL(url);
  } catch {
    /* malformed URL — skip platform detection */
  }

  // 1. Platform-specific adapter (highest base confidence).
  if (parsedUrl) {
    const adapter = findAdapter(parsedUrl);
    if (adapter) {
      const result = adapter.extract({ $, html, url: parsedUrl });
      if (result && hasAnyField(result.fields)) layers.push(result);
    }
  }

  // 2. JSON-LD JobPosting entries (possibly multiple).
  for (const fields of extractJsonLdFields(html)) {
    if (hasAnyField(fields)) layers.push({ source: "json-ld", fields });
  }

  // 3. Microdata (schema.org JobPosting via itemprop).
  const microdata = extractMicrodataFields($);
  if (hasAnyField(microdata)) layers.push({ source: "microdata", fields: microdata });

  // 4. Embedded JSON (__NEXT_DATA__, __INITIAL_STATE__, etc.).
  for (const fields of extractEmbeddedJsonFields(html)) {
    if (hasAnyField(fields)) layers.push({ source: "embedded-json", fields });
  }

  // 5. Open Graph + meta + title.
  const metaGroups = extractMetaFields($);
  metaGroups.forEach((fields, index) => {
    if (!hasAnyField(fields)) return;
    const source: LayerSource =
      index === 0 ? "open-graph" : index === metaGroups.length - 1 ? "title" : "meta";
    layers.push({ source, fields });
  });

  // 6. Semantic DOM selectors.
  const dom = extractDomFields($);
  if (hasAnyField(dom)) layers.push({ source: "dom", fields: dom });

  // 7. URL heuristics (slug-based company, careers subdomains).
  if (parsedUrl) {
    const urlFields = extractUrlFields(url);
    if (hasAnyField(urlFields)) layers.push({ source: "url", fields: urlFields });
  }

  // 8. Body text patterns (lowest base confidence — only contributes when
  //    nothing else found the field).
  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  const text: Partial<ParsedJobFields> = {
    salary: extractSalaryFromText(bodyText),
    location: extractLocationFromText(bodyText),
    recruiter: extractRecruiterFromText(bodyText),
  };
  if (hasAnyField(text)) layers.push({ source: "text", fields: text });

  return layers;
}

function hasAnyField(fields: Partial<ParsedJobFields> | undefined): boolean {
  if (!fields) return false;
  return Object.values(fields).some((value) => typeof value === "string" && value.trim().length > 0);
}

function titleFallbackFromHtml(html: string, $: CheerioAPI): Partial<ParsedJobFields> {
  const title =
    $('meta[property="og:title"]').attr("content") ?? $("title").first().text();
  if (!title) return {};
  const parsed = parseTitleTag(title);
  return {
    role: parsed.role,
    company: parsed.company,
    location: parsed.location,
  };
}

function applyPrimarySource(diagnostics: ParseDiagnostics): ParseJobSource {
  // Choose the highest-confidence-supplied field as the canonical source label.
  const entries = Object.entries(diagnostics.fieldSources) as Array<[FieldKey, LayerSource]>;
  if (entries.length === 0) return "url";

  const priority: FieldKey[] = ["role", "company", "salary", "location", "recruiter", "notes"];
  for (const key of priority) {
    const source = diagnostics.fieldSources[key];
    if (source) return publicSource(source);
  }
  return publicSource(entries[0][1]);
}

export function extractJobFieldsFromHtml(html: string, url: string): ParseJobResult {
  const startedAt = Date.now();
  const $ = cheerio.load(html);

  const layers = buildLayers(html, url, $);
  const { fields, diagnostics } = mergeLayersScored(layers, url);

  diagnostics.durationMs = Date.now() - startedAt;
  diagnostics.platform = detectPlatform(url, layers);

  // Title-tag fallback: if we still don't have a location after the merge,
  // try the parsed `<title>` once more.
  if (!fields.location) {
    const fallback = titleFallbackFromHtml(html, $);
    if (fallback.location) fields.location = fallback.location;
  }

  // Meta description: when it looks like a location/work-arrangement string,
  // pull it in if we still have nothing.
  if (!fields.location) {
    const description =
      $('meta[property="og:description"]').attr("content") ??
      $('meta[name="description"]').attr("content");
    if (description && isLikelyMetaLocation(description) && !isLikelyJobPostingDescription(description)) {
      fields.location = description.trim();
    }
  }

  if (!hasUsefulPublicFields(fields)) {
    logDiagnostics(diagnostics, "no-useful-fields");
    return {
      ok: false,
      error:
        "Couldn't extract details from that page. Some sites block auto-fill — enter the fields manually.",
    };
  }

  logDiagnostics(diagnostics, "ok");

  return {
    ok: true,
    fields,
    source: applyPrimarySource(diagnostics),
  };
}

function hasUsefulPublicFields(fields: ParsedJobFields): boolean {
  return Boolean(fields.role || fields.company || fields.location);
}

export function extractJobFieldsFromUrl(url: string): ParseJobResult {
  const urlFields = extractUrlFields(url);
  const { fields, diagnostics } = mergeLayersScored(
    [{ source: "url", fields: urlFields }],
    url,
  );
  diagnostics.platform = detectPlatform(url, [{ source: "url", fields: urlFields }]);
  diagnostics.durationMs = 0;

  if (!hasUsefulPublicFields(fields)) {
    logDiagnostics(diagnostics, "url-fallback-empty");
    return { ok: false, error: "Couldn't extract details from that link." };
  }

  logDiagnostics(diagnostics, "url-fallback");
  return { ok: true, fields, source: "url" };
}

function detectPlatform(url: string, layers: RawLayer[]): string | null {
  try {
    const adapter = findAdapter(new URL(url));
    if (adapter) return platformLabel(adapter.source);
  } catch {
    /* ignore malformed URLs */
  }
  // Fall back to whichever layer fired first
  const first = layers[0];
  return first ? platformLabel(first.source) : null;
}

function logDiagnostics(diagnostics: ParseDiagnostics, outcome: string): void {
  // Server-side logging only. Never surfaced to the client.
  if (process.env.JOB_PARSE_DEBUG === "1") {
    // eslint-disable-next-line no-console
    console.log("[job-parse]", outcome, JSON.stringify(diagnostics));
  }
}

function warningFromError(error: unknown): string {
  if (error instanceof JobParseError) {
    switch (error.code) {
      case "blocked":
        return "That site blocks automated reading — we filled what we could from the link.";
      case "captcha":
        return "That site is showing a bot challenge — we filled what we could from the link.";
      case "rate_limited":
        return "We're being rate-limited — we filled what we could from the link.";
      case "expired":
        return "That posting may have expired — we filled what we could from the link.";
      case "not_found":
        return "We couldn't find that posting — we filled what we could from the link.";
      case "timeout":
        return "That site was slow to respond — we filled what we could from the link.";
      case "too_large":
        return "That page was too large to read — we filled what we could from the link.";
      case "wrong_content_type":
        return "That link doesn't look like a job page — we filled what we could from the link.";
      default:
        return "Couldn't read the full posting — we filled what we could from the link.";
    }
  }
  return "Couldn't read the full posting — we filled what we could from the link.";
}

function errorMessage(error: unknown): string {
  if (error instanceof JobParseError) return error.message;
  if (error instanceof Error) return error.message;
  return "Could not read that job posting.";
}

export async function parseJobLink(url: string): Promise<ParseJobResult> {
  const { fetchJobPageHtml } = await import("@/lib/job-link/fetch-page");

  // Many companies embed Ashby/Greenhouse on their own domain with the job
  // ID in the query string. Rewriting to the canonical ATS host before
  // fetching lets the dedicated adapter extract the right job instead of
  // the parent careers page (which often lists many jobs or none at all).
  const canonicalUrl = canonicalizeJobUrl(url);
  const useCanonical = canonicalUrl !== url;

  if (useCanonical) {
    try {
      const html = await fetchJobPageHtml(canonicalUrl);
      const result = extractJobFieldsFromHtml(html, canonicalUrl);
      if (result.ok) return result;
    } catch {
      // fall through to the original URL
    }
  }

  try {
    const html = await fetchJobPageHtml(url);
    return extractJobFieldsFromHtml(html, url);
  } catch (error) {
    const urlFallback = extractJobFieldsFromUrl(url);
    if (urlFallback.ok) {
      return {
        ...urlFallback,
        warning: warningFromError(error),
      };
    }
    return { ok: false, error: errorMessage(error) };
  }
}
