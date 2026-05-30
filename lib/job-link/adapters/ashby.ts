import { cleanText, slugToLabel } from "@/lib/job-link/text-utils";
import { walkJson } from "@/lib/job-link/text-utils";
import type { AtsAdapter } from "@/lib/job-link/adapters/types";

/**
 * Ashby pages render via React and embed a `__NEXT_DATA__` JSON blob that
 * contains the job posting under `props.pageProps.jobPosting`. We prefer that
 * over the DOM because the rendered HTML is usually nearly empty until JS
 * runs (and our fetcher doesn't run JS).
 *
 * URL shape: jobs.ashbyhq.com/<slug>/<jobId>
 */
export const ashbyAdapter: AtsAdapter = {
  source: "ats:ashby",

  match(url) {
    return /(^|\.)ashbyhq\.com$/i.test(url.hostname);
  },

  extract({ $, html }) {
    let role: string | undefined;
    let location: string | undefined;
    let company: string | undefined;

    const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
    if (nextDataMatch?.[1]) {
      try {
        const parsed = JSON.parse(nextDataMatch[1]);
        walkJson(parsed, (node) => {
          if (role && location && company) return;
          const candidateTitle = node.title ?? node.jobTitle ?? node.name;
          const candidateLocation =
            node.locationName ??
            node.locationFriendlyName ??
            node.locationDisplayName ??
            (Array.isArray(node.workLocations) ? node.workLocations.join(", ") : undefined);
          const candidateCompany =
            node.organizationName ??
            node.companyName ??
            (typeof node.organization === "object" && node.organization && "name" in node.organization
              ? (node.organization as Record<string, unknown>).name
              : undefined);

          if (!role && typeof candidateTitle === "string") {
            const cleaned = cleanText(candidateTitle);
            if (cleaned && cleaned.length < 200) role = cleaned;
          }
          if (!location && typeof candidateLocation === "string") {
            location = cleanText(candidateLocation);
          }
          if (!company && typeof candidateCompany === "string") {
            company = cleanText(candidateCompany);
          }
        });
      } catch {
        /* ignore malformed JSON */
      }
    }

    if (!role) role = cleanText($("h1").first().text());

    return {
      source: "ats:ashby",
      fields: { role, company, location },
    };
  },
};

export { slugToLabel };
