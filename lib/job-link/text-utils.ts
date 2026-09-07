import type { ParsedJobFields } from "@/lib/job-link/types";
import {
  normalizeLocation,
  normalizeNotes,
  normalizeRecruiter,
  normalizeSalary,
} from "@/lib/job-link/field-validators";

export type JsonObject = Record<string, unknown>;

export function cleanText(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value !== "string") return undefined;

  const trimmed = value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();

  return trimmed.length > 0 ? trimmed : undefined;
}

export function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

export function slugToLabel(slug: string): string {
  return slug
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

const FORM_FIELD_PLACEHOLDERS =
  /^(title|name|role|company|employer|organization|organisation|location|locations|city|job title|job requisition name)$/i;

export function isLikelyCompanyName(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length < 2 || trimmed.length > 80) return false;
  if (FORM_FIELD_PLACEHOLDERS.test(trimmed)) return false;
  if (/^(home|careers|jobs|apply|search|login|sign in)$/i.test(trimmed)) return false;
  if (/^https?:\/\//i.test(trimmed)) return false;
  return true;
}

export function isLikelyRole(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length < 2 || trimmed.length > 160) return false;
  if (FORM_FIELD_PLACEHOLDERS.test(trimmed)) return false;
  if (/^(careers|jobs|job details|apply now|search jobs)$/i.test(trimmed)) return false;
  return true;
}

export function stripJobBoardSuffix(title: string): string {
  return title
    .replace(/\s*[|\u2013\u2014-]\s*(LinkedIn|Indeed|Glassdoor|ZipRecruiter|Monster|Careers|Jobs)\s*$/i, "")
    .replace(/\s*\|\s*Apply Now\s*$/i, "")
    .replace(/^Job Application for\s+/i, "")
    .replace(/^Apply for\s+/i, "")
    .trim();
}

export function parseTitleTag(title: string): ParsedJobFields {
  const cleaned = stripJobBoardSuffix(title);

  const hiringMatch = cleaned.match(/^(.+?)\s+hiring\s+(.+?)(?:\s+in\s+(.+))?$/i);
  if (hiringMatch) {
    return {
      company: cleanText(hiringMatch[1]),
      role: cleanText(hiringMatch[2]),
      location: cleanText(hiringMatch[3]),
    };
  }

  const atMatch = cleaned.match(/^(.+?)\s+at\s+(.+?)(?:\s+[-|\u2013\u2014]\s+(.+))?$/i);
  if (atMatch) {
    const role = cleanText(atMatch[1]);
    const company = cleanText(atMatch[2]);
    const tail = cleanText(atMatch[3]);
    return {
      role,
      company,
      location: tail && !/linkedin|indeed|glassdoor/i.test(tail) ? tail : undefined,
    };
  }

  for (const separator of [" | ", " - ", " – ", " — ", " · ", ": "]) {
    const index = cleaned.indexOf(separator);
    if (index <= 0) continue;

    const left = cleaned.slice(0, index).trim();
    const right = cleaned.slice(index + separator.length).trim();
    if (!left || !right) continue;

    const hiringWords = /careers|jobs|hiring|join the team|work with us|job board/i;
    if (hiringWords.test(right) && !hiringWords.test(left)) {
      const companyCandidate = right
        .replace(/\s*(careers|jobs|hiring|join the team!?|work with us|job board)\s*$/i, "")
        .trim();
      if (companyCandidate && isLikelyCompanyName(companyCandidate)) {
        return { role: left, company: companyCandidate };
      }
      return { role: left };
    }

    if (isLikelyRole(left) && isLikelyCompanyName(right)) {
      return { role: left, company: right };
    }
  }

  return isLikelyRole(cleaned) ? { role: cleaned } : {};
}

export function walkJson(value: unknown, visit: (node: JsonObject) => void): void {
  if (!value) return;

  if (Array.isArray(value)) {
    for (const item of value) walkJson(item, visit);
    return;
  }

  if (typeof value !== "object") return;

  const obj = value as JsonObject;
  visit(obj);

  for (const key of Object.keys(obj)) {
    if (key.startsWith("@")) continue;
    walkJson(obj[key], visit);
  }
}

export function nodeTypes(node: JsonObject): string[] {
  const type = node["@type"];
  if (!type) return [];
  return (Array.isArray(type) ? type : [type]).filter((entry): entry is string => typeof entry === "string");
}

export function isJobPostingNode(node: JsonObject): boolean {
  return nodeTypes(node).some((type) => type.toLowerCase().includes("jobposting"));
}
