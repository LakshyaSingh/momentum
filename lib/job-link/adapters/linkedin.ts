import type { CheerioAPI } from "cheerio";
import { firstLikelyRecruiterName } from "@/lib/job-link/field-validators";
import { extractSalaryFromText } from "@/lib/job-link/text-patterns";
import { cleanText, parseTitleTag } from "@/lib/job-link/text-utils";
import type { AtsAdapter } from "@/lib/job-link/adapters/types";

/**
 * LinkedIn job pages. Public (unauthenticated) HTML carries the title in
 * `og:title` as `"<Company> hiring <Role> in <Location> | LinkedIn"`, and
 * the recruiter is linked under `a[href*="/in/"]`.
 *
 * We deliberately do not pull the description into `notes` here — LinkedIn
 * descriptions are heavily truncated and full of "See this and similar jobs"
 * boilerplate. Instead, salary is mined from the description text only.
 */
export const linkedinAdapter: AtsAdapter = {
  source: "ats:linkedin",

  match(url) {
    return /linkedin\.com$/i.test(url.hostname);
  },

  extract({ $ }) {
    const ogTitle = metaContent($, "og:title") ?? cleanText($("title").first().text());
    const description =
      metaContent($, "og:description") ??
      metaContent($, "description") ??
      metaContent($, "twitter:description");

    const fromTitle = ogTitle ? parseTitleTag(ogTitle) : {};

    return {
      source: "ats:linkedin",
      fields: {
        role: fromTitle.role,
        company: fromTitle.company,
        location: fromTitle.location,
        salary:
          extractSalaryFromText(description) ??
          extractSalaryFromText(
            cleanText($(".compensation__salary-range, .salary, [class*='compensation']").first().text()),
          ),
        recruiter: extractLinkedInRecruiter($),
        // Notes intentionally omitted: LinkedIn descriptions are mostly
        // boilerplate that the validator would drop anyway.
        notes: undefined,
      },
    };
  },
};

function metaContent($: CheerioAPI, key: string): string | undefined {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return cleanText(
    $(`meta[property="${escaped}"], meta[name="${escaped}"]`).first().attr("content"),
  );
}

function extractLinkedInRecruiter($: CheerioAPI): string | undefined {
  const candidates: string[] = [];

  const recruiterSelectors = [
    'a[href*="/in/"][data-tracking-control-name="public_jobs"] span.sr-only',
    'a.base-card__full-link[href*="/in/"] span.sr-only',
    ".job-poster-card span.sr-only",
    '.base-main-card a[href*="/in/"] span.sr-only',
  ];

  for (const selector of recruiterSelectors) {
    $(selector).each((_, element) => {
      const name = cleanText($(element).text());
      if (name) candidates.push(name);
    });
  }

  $('a[href*="/in/"]').each((_, element) => {
    const href = $(element).attr("href") ?? "";
    if (!/\/in\/[a-z0-9-]+/i.test(href)) return;
    const srOnly = cleanText($(element).find("span.sr-only").first().text());
    if (srOnly) candidates.push(srOnly);
  });

  return firstLikelyRecruiterName(candidates);
}
