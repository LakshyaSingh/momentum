import { cleanText, slugToLabel } from "@/lib/job-link/text-utils";
import type { AtsAdapter } from "@/lib/job-link/adapters/types";

/**
 * SmartRecruiters pages live at jobs.smartrecruiters.com/<Company>/<id>-<role-slug>.
 * The role is rendered as `h1.job-title`, location as `[data-qa="company-name"]`,
 * etc. We also pull from the URL path because SmartRecruiters embeds the role
 * slug directly.
 */
export const smartrecruitersAdapter: AtsAdapter = {
  source: "ats:smartrecruiters",

  match(url) {
    return /smartrecruiters\.com$/i.test(url.hostname);
  },

  extract({ $, url }) {
    const segments = url.pathname.split("/").filter(Boolean);
    const companySlug = segments[0];
    const company = companySlug ? slugToLabel(companySlug) : undefined;

    const rawRoleSlug = segments[1] ? segments[1].replace(/^\d+-?/, "") : undefined;
    const roleFromUrl = rawRoleSlug ? slugToLabel(rawRoleSlug) : undefined;

    const role =
      cleanText($("h1.job-title").first().text()) ??
      cleanText($('[data-qa="job-title"]').first().text()) ??
      roleFromUrl;

    const location =
      cleanText($('[data-qa="job-location"]').first().text()) ??
      cleanText($(".job-location").first().text()) ??
      cleanText($('[itemprop="jobLocation"]').first().text());

    return {
      source: "ats:smartrecruiters",
      fields: { role, company, location },
    };
  },
};
