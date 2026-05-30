import { cleanText, slugToLabel } from "@/lib/job-link/text-utils";
import type { AtsAdapter } from "@/lib/job-link/adapters/types";

/**
 * BambooHR pages live on `<tenant>.bamboohr.com/careers/<id>`. The tenant
 * subdomain is the company slug. The DOM has the role in `h2.posting-title`
 * or `.posting-title`, and the location in `.posting-location` / `.position-location`.
 */
export const bamboohrAdapter: AtsAdapter = {
  source: "ats:bamboohr",

  match(url) {
    return /(^|\.)bamboohr\.com$/i.test(url.hostname);
  },

  extract({ $, url }) {
    const tenant = url.hostname.replace(/\.bamboohr\.com$/i, "").toLowerCase();
    const company =
      tenant && tenant !== "www" && tenant !== "app" && tenant !== "one"
        ? slugToLabel(tenant)
        : undefined;

    const role =
      cleanText($("h2.posting-title").first().text()) ??
      cleanText($(".posting-title").first().text()) ??
      cleanText($("[data-test='job-title']").first().text()) ??
      cleanText($("h1").first().text());

    const location =
      cleanText($(".posting-location").first().text()) ??
      cleanText($(".position-location").first().text()) ??
      cleanText($("[data-test='job-location']").first().text());

    return {
      source: "ats:bamboohr",
      fields: { role, company, location },
    };
  },
};
