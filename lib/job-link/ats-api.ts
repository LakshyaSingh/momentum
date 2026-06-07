import { cleanText, slugToLabel } from "@/lib/job-link/text-utils";
import type { ParsedJobFields } from "@/lib/job-link/types";

/**
 * Official, public ATS JSON endpoints.
 *
 * Greenhouse and Lever both expose unauthenticated JSON for any published job.
 * Hitting these instead of scraping the HTML page is faster, more reliable, and
 * never trips the bot challenge that the rendered career pages serve to
 * datacenter IPs. We only ever call the fixed ATS API hosts (not the user's
 * URL host), so there's no SSRF surface here beyond a normal outbound fetch.
 *
 * This stays within the project's deterministic "no headless browser, no LLM"
 * rule — it's just calling the platform's own documented data API.
 *
 * Docs:
 *   Greenhouse: https://developers.greenhouse.io/job-board.html
 *   Lever:      https://github.com/lever/postings-api
 */

const API_TIMEOUT_MS = 8_000;

async function fetchJson(apiUrl: string): Promise<unknown | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    const res = await fetch(apiUrl, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (compatible; MomentumJobTracker/1.0; +https://job-tracker-alpha-blush.vercel.app)",
      },
    });
    if (!res.ok) return null;
    if (!(res.headers.get("content-type") ?? "").includes("json")) return null;
    return (await res.json()) as unknown;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : undefined;
}

// ---------------------------------------------------------------------------
// Greenhouse
// ---------------------------------------------------------------------------

function greenhouseTarget(url: URL): { apiBase: string; tenant: string; id: string } | undefined {
  if (!/(^|\.)greenhouse\.io$/i.test(url.hostname)) return undefined;

  const segments = url.pathname.split("/").filter(Boolean);
  // .../<tenant>/jobs/<id>
  const jobsIdx = segments.indexOf("jobs");
  const tenant = jobsIdx > 0 ? segments[jobsIdx - 1] : segments[0];
  const id =
    jobsIdx >= 0 && segments[jobsIdx + 1]
      ? segments[jobsIdx + 1]
      : (url.searchParams.get("gh_jid") ?? undefined);

  if (!tenant || !id || !/^\d+$/.test(id)) return undefined;

  // EU-hosted boards have a parallel API host; fall back to the global one.
  const apiBase = /\.eu\.greenhouse\.io$/i.test(url.hostname)
    ? "https://boards-api.eu.greenhouse.io"
    : "https://boards-api.greenhouse.io";

  return { apiBase, tenant, id };
}

async function fromGreenhouse(url: URL): Promise<ParsedJobFields | null> {
  const target = greenhouseTarget(url);
  if (!target) return null;

  const json = asRecord(
    await fetchJson(`${target.apiBase}/v1/boards/${target.tenant}/jobs/${target.id}`),
  );
  if (!json) return null;

  const role = cleanText(json.title);
  const location = cleanText(asRecord(json.location)?.name);
  if (!role && !location) return null;

  return prune({
    role,
    location,
    company: slugToLabel(target.tenant),
  });
}

// ---------------------------------------------------------------------------
// Lever
// ---------------------------------------------------------------------------

function leverTarget(url: URL): { tenant: string; id: string } | undefined {
  if (!/(^|\.)lever\.co$/i.test(url.hostname)) return undefined;
  const segments = url.pathname.split("/").filter(Boolean);
  const tenant = segments[0];
  const id = segments[1];
  // Lever posting ids are UUIDs.
  if (!tenant || !id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return undefined;
  }
  return { tenant, id };
}

function leverSalary(range: Record<string, unknown> | undefined): string | undefined {
  if (!range) return undefined;
  const min = typeof range.min === "number" ? range.min : undefined;
  const max = typeof range.max === "number" ? range.max : undefined;
  if (min === undefined && max === undefined) return undefined;
  const currency = typeof range.currency === "string" ? range.currency : "USD";
  const symbol = currency === "USD" ? "$" : `${currency} `;
  const fmt = (n: number) => `${symbol}${n.toLocaleString("en-US")}`;
  const interval = typeof range.interval === "string" ? range.interval.toLowerCase() : "";
  const perYear = /year|annual/.test(interval) ? " / year" : "";
  if (min !== undefined && max !== undefined) return `${fmt(min)}–${fmt(max)}${perYear}`;
  return `${fmt((min ?? max)!)}${perYear}`;
}

async function fromLever(url: URL): Promise<ParsedJobFields | null> {
  const target = leverTarget(url);
  if (!target) return null;

  const json = asRecord(await fetchJson(`https://api.lever.co/v0/postings/${target.tenant}/${target.id}`));
  if (!json) return null;

  const role = cleanText(json.text);
  const categories = asRecord(json.categories);
  const location = cleanText(categories?.location);
  if (!role && !location) return null;

  return prune({
    role,
    location,
    company: slugToLabel(target.tenant),
    salary: leverSalary(asRecord(json.salaryRange)),
  });
}

// ---------------------------------------------------------------------------
// Ashby
// ---------------------------------------------------------------------------

function ashbyTarget(url: URL): { tenant: string; id: string } | undefined {
  if (!/(^|\.)ashbyhq\.com$/i.test(url.hostname)) return undefined;
  const segments = url.pathname.split("/").filter(Boolean);
  const tenant = segments[0];
  const id = segments[1] ?? url.searchParams.get("ashby_jid") ?? undefined;
  if (!tenant || !id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return undefined;
  }
  return { tenant, id };
}

function cleanAshbyLocation(value: unknown): string | undefined {
  // Ashby prefixes some locations like "*HQ - San Francisco, CA".
  const text = cleanText(value);
  return text ? text.replace(/^\*?\s*(HQ\s*-\s*)?/i, "").trim() || undefined : undefined;
}

async function fromAshby(url: URL): Promise<ParsedJobFields | null> {
  const target = ashbyTarget(url);
  if (!target) return null;

  // Ashby's public API has no get-one-by-id endpoint — it returns the whole
  // board, so we fetch it and find the posting matching the URL's job id.
  const json = asRecord(
    await fetchJson(
      `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(target.tenant)}?includeCompensation=true`,
    ),
  );
  const jobs = Array.isArray(json?.jobs) ? json!.jobs : [];
  const job = asRecord(jobs.find((j) => asRecord(j)?.id === target.id));
  if (!job) return null;

  const role = cleanText(job.title);
  if (!role) return null;

  return prune({
    role,
    location: cleanAshbyLocation(job.location),
    company: slugToLabel(target.tenant),
    salary: cleanText(asRecord(job.compensation)?.compensationTierSummary),
  });
}

// ---------------------------------------------------------------------------
// SmartRecruiters
// ---------------------------------------------------------------------------

function smartRecruitersTarget(url: URL): { company: string; id: string } | undefined {
  if (!/(^|\.)smartrecruiters\.com$/i.test(url.hostname)) return undefined;
  const segments = url.pathname.split("/").filter(Boolean);
  const company = segments[0];
  // Posting path is "<id>-<slug>" or just "<id>"; the id is the leading digits.
  const idMatch = segments[1]?.match(/^(\d{6,})/);
  if (!company || !idMatch) return undefined;
  return { company, id: idMatch[1]! };
}

async function fromSmartRecruiters(url: URL): Promise<ParsedJobFields | null> {
  const target = smartRecruitersTarget(url);
  if (!target) return null;

  const json = asRecord(
    await fetchJson(
      `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(target.company)}/postings/${target.id}`,
    ),
  );
  if (!json) return null;

  const role = cleanText(json.name);
  const location = asRecord(json.location);
  const companyName = cleanText(asRecord(json.company)?.name) ?? slugToLabel(target.company);
  if (!role) return null;

  return prune({
    role,
    location: cleanText(location?.fullLocation),
    company: companyName,
  });
}

function prune(fields: ParsedJobFields): ParsedJobFields {
  return Object.fromEntries(
    Object.entries(fields).filter(([, v]) => typeof v === "string" && v.length > 0),
  ) as ParsedJobFields;
}

/**
 * Try the official ATS JSON API for a job URL. Returns parsed fields on a
 * confident hit, or null to let the caller fall back to HTML scraping.
 */
export async function fetchFieldsFromAtsApi(rawUrl: string): Promise<ParsedJobFields | null> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  return (
    (await fromGreenhouse(url)) ??
    (await fromLever(url)) ??
    (await fromAshby(url)) ??
    (await fromSmartRecruiters(url))
  );
}
