import { cleanText, slugToLabel } from "@/lib/job-link/text-utils";
import type { AtsAdapter } from "@/lib/job-link/adapters/types";

/**
 * Rippling ATS — same logic that previously lived in `lib/job-link/rippling.ts`,
 * adapted to the new Adapter interface.
 *
 * URL shape: ats.rippling.com/<slug>/jobs/<uuid>
 * The role is in `__NEXT_DATA__ → props.pageProps.apiData.jobPost.name`,
 * the company is derived from the slug or the "About <Company>" preamble in
 * the description HTML, and the location is in `workLocations`.
 */
export const ripplingAdapter: AtsAdapter = {
  source: "ats:rippling",

  match(url) {
    return /(^|\.)ats\.rippling\.com$/i.test(url.hostname);
  },

  extract({ html, url }) {
    const slug = url.pathname.split("/").filter(Boolean)[0]?.toLowerCase();
    const slugCompany = slug ? slugToLabel(slug) : undefined;

    const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
    if (!nextDataMatch?.[1]) {
      return {
        source: "ats:rippling",
        fields: { company: slugCompany },
      };
    }

    try {
      const data = JSON.parse(nextDataMatch[1]) as {
        props?: { pageProps?: { apiData?: Record<string, unknown> } };
      };
      const apiData = data.props?.pageProps?.apiData;
      if (!apiData || typeof apiData !== "object") {
        return { source: "ats:rippling", fields: { company: slugCompany } };
      }

      const jobPost = apiData.jobPost as Record<string, unknown> | undefined;
      const role = cleanText(jobPost?.name);

      const description = jobPost?.description as Record<string, unknown> | undefined;
      const companyHtml = description?.company;
      let companyFromDescription: string | undefined;
      if (typeof companyHtml === "string") {
        const aboutMatch = companyHtml.match(/About\s+([A-Za-z][A-Za-z0-9 .'-]{0,40})/);
        if (aboutMatch?.[1]) companyFromDescription = cleanText(aboutMatch[1]);
      }

      const workLocations = apiData.workLocations;
      const location = Array.isArray(workLocations)
        ? workLocations
            .map((entry) => cleanText(entry))
            .filter((entry): entry is string => Boolean(entry))
            .join(" · ")
        : undefined;

      return {
        source: "ats:rippling",
        fields: {
          role,
          company: companyFromDescription ?? slugCompany,
          location,
        },
      };
    } catch {
      return { source: "ats:rippling", fields: { company: slugCompany } };
    }
  },
};
