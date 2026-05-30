import { cleanText, slugToLabel } from "@/lib/job-link/text-utils";
import type { AtsAdapter } from "@/lib/job-link/adapters/types";

/**
 * Greenhouse-hosted boards live on a handful of domains:
 *   - boards.greenhouse.io/<slug>/jobs/<id>
 *   - job-boards.greenhouse.io/<slug>/jobs/<id>
 *   - <slug>.greenhouse.io
 *
 * The page title is reliably `"Job Application for <Role> at <Company>"` and
 * the role appears in `h1.app-title` or the `<h1>` inside `#header`.
 */
export const greenhouseAdapter: AtsAdapter = {
  source: "ats:greenhouse",

  match(url) {
    return /(^|\.)greenhouse\.io$/i.test(url.hostname);
  },

  extract({ $ }) {
    const role =
      cleanText($("h1.app-title").first().text()) ??
      cleanText($("#header h1").first().text()) ??
      cleanText($(".posting-header h1").first().text());

    const companyFromDom =
      cleanText($("#header .company-name").first().text()) ??
      cleanText($(".company-name").first().text()) ??
      cleanText($("[data-company-name]").first().attr("data-company-name") ?? undefined);

    const titleTag = cleanText($("title").first().text());
    const titleAtMatch = titleTag?.match(/Job Application for\s+(.+?)\s+at\s+(.+)$/i);
    const company = companyFromDom ?? cleanText(titleAtMatch?.[2]);

    const location = cleanText($(".location, .app-location, .job-location").first().text());

    return {
      source: "ats:greenhouse",
      fields: { role, company, location },
    };
  },
};

// Re-export to satisfy any lingering references; not used in this module.
export { slugToLabel };
