import type { CheerioAPI } from "cheerio";
import type { ParsedJobFields } from "@/lib/job-link/types";
import {
  isLikelyJobPostingDescription,
  isLikelyLocation,
  isLikelyMetaLocation,
} from "@/lib/job-link/field-validators";
import { cleanText, isLikelyCompanyName, isLikelyRole, parseTitleTag } from "@/lib/job-link/text-utils";

function metaContent($: CheerioAPI, key: string): string | undefined {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const node = $(`meta[property="${escaped}"], meta[name="${escaped}"]`).first();
  if (node.length === 0) {
    const reversed = $(`meta[content][property="${escaped}"], meta[content][name="${escaped}"]`).first();
    return cleanText(reversed.attr("content"));
  }
  return cleanText(node.attr("content"));
}

function parseMetaTitle(value: string | undefined): ParsedJobFields {
  if (!value) return {};
  const parsed = parseTitleTag(value);
  if (parsed.role || parsed.company) return parsed;
  return isLikelyRole(value) ? { role: value } : {};
}

export function extractMetaFields($: CheerioAPI): ParsedJobFields[] {
  const ogTitle = metaContent($, "og:title") ?? metaContent($, "twitter:title");
  const titleMeta = metaContent($, "title");
  const pageTitle = cleanText($("title").first().text());

  const fromOgTitle = parseMetaTitle(ogTitle);
  const fromTitleMeta = parseMetaTitle(titleMeta);
  const fromPageTitle = pageTitle ? parseTitleTag(pageTitle) : {};

  const ogDescription =
    metaContent($, "og:description") ??
    metaContent($, "twitter:description") ??
    metaContent($, "description");

  const openGraph: ParsedJobFields = {
    ...fromOgTitle,
    company:
      fromOgTitle.company ??
      metaContent($, "og:site_name") ??
      metaContent($, "twitter:site")?.replace(/^@/, "") ??
      metaContent($, "application-name"),
    location:
      fromOgTitle.location ??
      (isLikelyMetaLocation(ogDescription) ? ogDescription : undefined) ??
      metaContent($, "og:locality") ??
      metaContent($, "og:region") ??
      metaContent($, "geo.placename") ??
      metaContent($, "geo.region"),
    notes:
      isLikelyMetaLocation(ogDescription) || isLikelyJobPostingDescription(ogDescription)
        ? undefined
        : ogDescription,
  };

  const extraMeta: ParsedJobFields = {
    role:
      metaContent($, "job:title") ??
      metaContent($, "parsely-title") ??
      metaContent($, "sailthru.title"),
    company:
      metaContent($, "job:company") ??
      metaContent($, "company") ??
      metaContent($, "author"),
    location: metaContent($, "job:location") ?? metaContent($, "location"),
    salary: metaContent($, "job:salary") ?? metaContent($, "salary"),
  };

  return [openGraph, extraMeta, fromTitleMeta, fromPageTitle].filter(
    (fields) => Object.keys(fields).length > 0,
  );
}

export function extractMicrodataFields($: CheerioAPI): ParsedJobFields {
  const scope = $('[itemtype*="JobPosting"], [itemscope][itemtype*="job"]').first();
  if (scope.length === 0) return {};

  const read = (prop: string) => cleanText(scope.find(`[itemprop="${prop}"]`).first().text());

  const companyNode = scope.find('[itemprop="hiringOrganization"], [itemprop="employer"]').first();
  const company =
    cleanText(companyNode.find('[itemprop="name"]').first().text()) ??
    cleanText(companyNode.text()) ??
    read("name");

  const locationNode = scope.find('[itemprop="jobLocation"], [itemprop="location"]').first();
  const location =
    cleanText(locationNode.find('[itemprop="addressLocality"]').first().text()) ??
    cleanText(locationNode.text()) ??
    read("addressLocality");

  return {
    role: read("title") ?? read("name"),
    company: isLikelyCompanyName(company ?? "") ? company : undefined,
    location,
    salary: read("baseSalary") ?? read("salary") ?? read("compensation"),
    notes: read("description"),
  };
}

const ROLE_SELECTORS = [
  "h1[data-automation-id='jobPostingHeader']",
  "h1.posting-headline",
  "h1.job-title",
  "h1[class*='job-title']",
  "h1[class*='JobTitle']",
  "[data-testid='job-title']",
  "[data-testid='jobTitle']",
  ".job-title",
  ".jobTitle",
  "#job-title",
  ".posting-title",
  ".vacancy-title",
  "h1",
];

const COMPANY_SELECTORS = [
  "[data-company-name]",
  "[data-testid='company-name']",
  ".company-name",
  ".employer-name",
  ".job-company",
  ".posting-company",
  ".logo-comp-name",
  "a[class*='company']",
  ".topcard__org-name-link",
  ".jobs-unified-top-card__company-name",
];

const LOCATION_SELECTORS = [
  ".job-location",
  "[data-testid='location']",
  "[data-testid='job-location']",
  "[data-automation-id='location']",
  ".job-location",
  ".posting-location",
  ".jobs-unified-top-card__bullet",
];

const SALARY_SELECTORS = [
  "[data-testid='salary']",
  "[data-automation-id='compensation']",
  ".salary",
  ".compensation",
  ".job-salary",
  "[class*='salary']",
];

function firstMatchingText($: CheerioAPI, selectors: string[]): string | undefined {
  for (const selector of selectors) {
    const text = cleanText($(selector).first().text());
    if (text) return text;
  }
  return undefined;
}

export function extractDomFields($: CheerioAPI): ParsedJobFields {
  const role = firstMatchingText($, ROLE_SELECTORS);
  const companyRaw = firstMatchingText($, COMPANY_SELECTORS);
  const company = companyRaw && isLikelyCompanyName(companyRaw) ? companyRaw : undefined;

  let location = firstMatchingText($, LOCATION_SELECTORS);
  if (location && (!isLikelyLocation(location) || location.length > 120)) location = undefined;

  const salary = firstMatchingText($, SALARY_SELECTORS);

  return {
    role: role && isLikelyRole(role) ? role : undefined,
    company,
    location,
    salary,
  };
}
