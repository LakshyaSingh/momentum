import type { ParsedJobFields } from "@/lib/job-link/types";
import { cleanText, parseTitleTag, slugToLabel } from "@/lib/job-link/text-utils";

const BRAND_COMPANY_NAMES: Record<string, string> = {
  tesla: "Tesla",
  onezero: "OneZero",
};

function companyFromHostname(host: string): string | undefined {
  const hostParts = host.split(".");
  const brandHost =
    hostParts[0] === "www" || hostParts[0] === "apply" || hostParts[0] === "boards"
      ? hostParts[1]
      : hostParts[0];

  if (!brandHost || ["com", "io", "co", "org", "net", "jobs"].includes(brandHost)) {
    return undefined;
  }

  return BRAND_COMPANY_NAMES[brandHost] ?? slugToLabel(brandHost);
}

function parseWorkdayPath(pathname: string): ParsedJobFields {
  const match = pathname.match(/\/job\/([^/]+)\/([^/?#]+)/i);
  if (!match) return {};

  const locationSlug = match[1] ?? "";
  const titleSlug = match[2] ?? "";

  const location = locationSlug
    .split("-")
    .map((part) => (/^[A-Z]{2}$/.test(part) ? part : slugToLabel(part)))
    .join(", ")
    .replace(/, ([A-Z]{2}), /, ", $1 · ");

  const role = slugToLabel(titleSlug.replace(/_[A-Z0-9]+$/i, ""));

  return { role, location };
}

function parseSmartRecruiters(pathname: string): ParsedJobFields {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length < 2) return {};

  return {
    company: slugToLabel(segments[0]!),
    role: slugToLabel(segments.slice(1).join("-").replace(/-[a-f0-9]{8,}$/i, "")),
  };
}

function parseAppleJobs(pathname: string): ParsedJobFields {
  const match = pathname.match(/\/details\/[^/]+\/([^/?#]+)/i);
  if (!match?.[1]) return {};
  return { role: slugToLabel(match[1]) };
}

function parseLinkedIn(pathname: string, search: string): ParsedJobFields {
  const params = new URLSearchParams(search);
  const title = params.get("title");
  const company = params.get("company") ?? params.get("companyName");

  return {
    role: title ? cleanText(decodeURIComponent(title.replace(/\+/g, " "))) : undefined,
    company: company ? cleanText(decodeURIComponent(company.replace(/\+/g, " "))) : undefined,
  };
}

function parseIndeed(search: string): ParsedJobFields {
  const params = new URLSearchParams(search);
  const company = params.get("cmp") ?? params.get("from");
  return {
    company: company ? slugToLabel(decodeURIComponent(company)) : undefined,
  };
}

export function extractUrlFields(url: string): ParsedJobFields {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const segments = parsed.pathname.split("/").filter(Boolean);

    if (host.includes("greenhouse.io") && segments[0] && !/^\d+$/.test(segments[0])) {
      return { company: slugToLabel(segments[0]) };
    }

    if (host.includes("lever.co") && segments[0]) {
      return { company: slugToLabel(segments[0]) };
    }

    if (host.includes("ashbyhq.com") && segments[0]) {
      return { company: slugToLabel(segments[0]) };
    }

    if (host.includes("rippling.com") && segments.length >= 2 && segments[1] === "jobs") {
      return { company: slugToLabel(segments[0]!) };
    }

    const bamboohrMatch = host.match(/^([a-z0-9-]+)\.bamboohr\.com$/i);
    if (bamboohrMatch?.[1]) {
      const slug = bamboohrMatch[1].toLowerCase();
      return {
        company: BRAND_COMPANY_NAMES[slug] ?? slugToLabel(slug),
      };
    }

    if (host.includes("myworkdayjobs.com")) {
      const companySegment = segments.find((segment) => /careers/i.test(segment));
      const workday = parseWorkdayPath(parsed.pathname);
      if (companySegment) {
        workday.company = slugToLabel(companySegment.replace(/careers/i, ""));
      }
      return workday;
    }

    if (host.includes("smartrecruiters.com")) {
      return parseSmartRecruiters(parsed.pathname);
    }

    if (host.includes("jobs.apple.com")) {
      return parseAppleJobs(parsed.pathname);
    }

    if (host.includes("linkedin.com")) {
      return parseLinkedIn(parsed.pathname, parsed.search);
    }

    if (host.includes("indeed.com")) {
      return parseIndeed(parsed.search);
    }

    if (host.endsWith("tesla.com")) {
      return { company: "Tesla" };
    }

    if (host.startsWith("jobs.")) {
      const companyHost = host.slice("jobs.".length);
      return { company: slugToLabel(companyHost.split(".")[0] ?? companyHost) };
    }

    if (host.startsWith("careers.")) {
      const companyHost = host.slice("careers.".length);
      return { company: slugToLabel(companyHost.split(".")[0] ?? companyHost) };
    }

    if (segments.length >= 2 && /^(jobs|careers|openings|position|positions)$/i.test(segments[0]!)) {
      const company = slugToLabel(segments[1]!);
      const role = segments[2] ? slugToLabel(segments[2]) : undefined;
      return { company, role };
    }

    const company = companyFromHostname(host);
    if (company) return { company };
  } catch {
    return {};
  }

  return {};
}

export function enrichTitleWithUrl(titleFields: ParsedJobFields, url: string): ParsedJobFields {
  if (titleFields.company && titleFields.role) return titleFields;

  const urlFields = extractUrlFields(url);
  return {
    role: titleFields.role ?? urlFields.role,
    company: titleFields.company ?? urlFields.company,
    location: titleFields.location ?? urlFields.location,
  };
}

export function parseHeadingText(text: string, url: string): ParsedJobFields {
  return enrichTitleWithUrl(parseTitleTag(text), url);
}
