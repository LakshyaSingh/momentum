import { cleanText, slugToLabel } from "@/lib/job-link/text-utils";
import type { AtsAdapter } from "@/lib/job-link/adapters/types";

/**
 * Lever postings live at jobs.lever.co/<slug>/<id>. The role is in
 * `.posting-headline h2` (or the page `<h1>`), and the company is the slug.
 * Location is in `.posting-categories .location` or `.sort-by-time`.
 */
export const leverAdapter: AtsAdapter = {
  source: "ats:lever",

  match(url) {
    return /(^|\.)lever\.co$/i.test(url.hostname);
  },

  extract({ $ }) {
    const role =
      cleanText($(".posting-headline h2").first().text()) ??
      cleanText($("h2.posting-headline").first().text());

    const location =
      cleanText($(".posting-categories .location").first().text()) ??
      cleanText($(".sort-by-time").first().text()) ??
      cleanText($("[data-qa='posting-location']").first().text());

    return {
      source: "ats:lever",
      fields: { role, location },
    };
  },
};

export { slugToLabel };
