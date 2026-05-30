import { structuredSalaryFromJsonLd } from "@/lib/job-link/salary";
import type { ParsedJobFields } from "@/lib/job-link/types";
import {
  cleanText,
  isJobPostingNode,
  isLikelyCompanyName,
  isLikelyRole,
  type JsonObject,
  walkJson,
} from "@/lib/job-link/text-utils";

function organizationName(value: unknown): string | undefined {
  if (typeof value === "string") return cleanText(value);
  if (!value || typeof value !== "object") return undefined;

  const org = value as JsonObject;
  return cleanText(org.name) ?? cleanText(org.legalName) ?? cleanText(org.alternateName);
}

function organizationUrl(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;

  const org = value as JsonObject;
  const sameAs = org.sameAs;
  return (
    cleanText(org.url) ??
    (Array.isArray(sameAs) ? sameAs.map(cleanText).find(Boolean) : cleanText(sameAs))
  );
}

function locationFromAddress(addr: JsonObject): string | undefined {
  const locality = cleanText(addr.addressLocality);
  const region = cleanText(addr.addressRegion);
  const country = cleanText(addr.addressCountry);
  const joined = [locality, region, country].filter(Boolean).join(", ");
  return joined || cleanText(addr.streetAddress);
}

function locationFromJobLocation(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return cleanText(value);

  const values = Array.isArray(value) ? value : [value];
  const parts = values
    .map((entry) => {
      if (typeof entry === "string") return cleanText(entry);
      if (!entry || typeof entry !== "object") return undefined;

      const place = entry as JsonObject;
      const address = place.address;

      if (typeof address === "string") return cleanText(address);
      if (address && typeof address === "object") {
        return locationFromAddress(address as JsonObject);
      }

      return cleanText(place.name);
    })
    .filter((entry): entry is string => Boolean(entry));

  return parts.length > 0 ? parts.join(" · ") : undefined;
}

function remoteFromRequirements(value: unknown): string | undefined {
  if (!value) return undefined;

  const values = Array.isArray(value) ? value : [value];
  for (const entry of values) {
    if (typeof entry === "string" && /remote|telecommute|anywhere/i.test(entry)) return "Remote";
    if (!entry || typeof entry !== "object") continue;

    const req = entry as JsonObject;
    const type = cleanText(req["@type"]);
    const name = cleanText(req.name);
    if (type?.toLowerCase().includes("country") || name) {
      if (/remote|anywhere|worldwide/i.test(name ?? "")) return "Remote";
    }
  }

  return undefined;
}

function salaryFromMonetary(value: unknown): string | undefined {
  // Delegate to the structured parser. Returns the display string when the
  // shape is valid + plausible; otherwise undefined so the orchestrator falls
  // back to body-text mining.
  const structured = structuredSalaryFromJsonLd(value);
  return structured?.display;
}

function recruiterFromContact(value: unknown): string | undefined {
  if (!value) return undefined;

  const contacts = Array.isArray(value) ? value : [value];
  for (const entry of contacts) {
    if (typeof entry === "string") return cleanText(entry);
    if (!entry || typeof entry !== "object") continue;

    const contact = entry as JsonObject;
    const name = cleanText(contact.name);
    if (name) return name;
  }

  return undefined;
}

function notesFromDescription(value: unknown): string | undefined {
  const text = cleanText(value);
  if (!text) return undefined;
  return text.length > 500 ? `${text.slice(0, 497)}…` : text;
}

function fieldsFromPosting(posting: JsonObject): ParsedJobFields {
  const jobLocationType = cleanText(posting.jobLocationType);
  const remote =
    jobLocationType?.toUpperCase() === "TELECOMMUTE"
      ? "Remote"
      : remoteFromRequirements(posting.applicantLocationRequirements);

  const location =
    locationFromJobLocation(posting.jobLocation) ??
    remote ??
    locationFromJobLocation(posting.jobLocationType);

  return {
    role: cleanText(posting.title) ?? cleanText(posting.occupationalCategory),
    company: organizationName(posting.hiringOrganization) ?? organizationName(posting.employerOverview),
    hiringOrgUrl: organizationUrl(posting.hiringOrganization) ?? organizationUrl(posting.employerOverview),
    location,
    salary:
      salaryFromMonetary(posting.baseSalary) ??
      salaryFromMonetary(posting.estimatedSalary) ??
      cleanText(posting.incentiveCompensation),
    recruiter: recruiterFromContact(posting.contactPoint) ?? recruiterFromContact(posting.hiringManager),
    notes: notesFromDescription(posting.description),
  };
}

function postingFromGenericNode(node: JsonObject): ParsedJobFields | undefined {
  const roleCandidate =
    cleanText(node.title) ?? cleanText(node.jobTitle) ?? cleanText(node.positionTitle);
  const companyCandidate =
    organizationName(node.hiringOrganization) ??
    organizationName(node.company) ??
    organizationName(node.employer) ??
    cleanText(node.companyName);
  const locationCandidate =
    locationFromJobLocation(node.jobLocation) ??
    locationFromJobLocation(node.location) ??
    cleanText(node.city);

  const role = roleCandidate && isLikelyRole(roleCandidate) ? roleCandidate : undefined;
  const company =
    companyCandidate && isLikelyCompanyName(companyCandidate) ? companyCandidate : undefined;
  const location =
    locationCandidate && !/^(location|locations|city)$/i.test(locationCandidate.trim())
      ? locationCandidate
      : undefined;

  if (!role && !company) return undefined;

  return {
    role,
    company,
    hiringOrgUrl: organizationUrl(node.hiringOrganization),
    location,
    salary:
      salaryFromMonetary(node.baseSalary) ??
      salaryFromMonetary(node.estimatedSalary) ??
      cleanText(node.salary) ??
      cleanText(node.compensation),
  };
}

export function extractJsonLdFields(html: string): ParsedJobFields[] {
  const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const results: ParsedJobFields[] = [];

  let match: RegExpExecArray | null;
  while ((match = scriptRegex.exec(html)) !== null) {
    const raw = match[1]?.trim();
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw);
      walkJson(parsed, (node) => {
        if (isJobPostingNode(node)) {
          results.push(fieldsFromPosting(node));
          return;
        }

        const generic = postingFromGenericNode(node);
        if (generic) results.push(generic);
      });
    } catch {
      /* ignore malformed JSON-LD */
    }
  }

  return results;
}

export function extractEmbeddedJsonFields(html: string): ParsedJobFields[] {
  const results: ParsedJobFields[] = [];

  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (nextDataMatch?.[1]) {
    try {
      walkJson(JSON.parse(nextDataMatch[1]), (node) => {
        if (isJobPostingNode(node)) results.push(fieldsFromPosting(node));
        else {
          const generic = postingFromGenericNode(node);
          if (generic) results.push(generic);
        }
      });
    } catch {
      /* ignore */
    }
  }

  const statePatterns = [
    /window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?});/i,
    /window\.__PRELOADED_STATE__\s*=\s*({[\s\S]*?});/i,
    /window\.__APP_INITIAL_STATE__\s*=\s*({[\s\S]*?});/i,
  ];

  for (const pattern of statePatterns) {
    const match = html.match(pattern);
    if (!match?.[1]) continue;

    try {
      walkJson(JSON.parse(match[1]), (node) => {
        const generic = postingFromGenericNode(node);
        if (generic) results.push(generic);
      });
    } catch {
      /* ignore */
    }
  }

  return results;
}
