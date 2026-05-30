import { cleanText, slugToLabel } from "@/lib/job-link/text-utils";
import type { AtsAdapter } from "@/lib/job-link/adapters/types";

/**
 * Workday postings live on `*.myworkdayjobs.com` or `*.wd5.myworkdayjobs.com`.
 * The role appears in the rendered HTML at `h1[data-automation-id="jobPostingHeader"]`.
 * The company can be derived from the path: `/en-US/<CompanyCareers>/job/<location>/<role>`.
 */
export const workdayAdapter: AtsAdapter = {
  source: "ats:workday",

  match(url) {
    return /myworkdayjobs\.com$/i.test(url.hostname);
  },

  extract({ $, url }) {
    const role =
      cleanText($('h1[data-automation-id="jobPostingHeader"]').first().text()) ??
      cleanText($('[data-automation-id="jobPostingHeader"]').first().text());

    const location =
      cleanText($('[data-automation-id="locations"] [data-automation-id="location"]').first().text()) ??
      cleanText($('[data-automation-id="locations"]').first().text()) ??
      cleanText($('[data-automation-id="location"]').first().text());

    // Workday's tenant subdomain (e.g. `<company>.wd5.myworkdayjobs.com`) is
    // the most reliable company source on this platform — keep it.
    const tenant = url.hostname.split(".")[0];
    const tenantCompany =
      tenant && tenant !== "www" ? slugToLabel(tenant.replace(/^wd\d+$/i, "")) : undefined;

    // Some Workday URLs include the company name in a path segment that ends
    // with "Careers". Prefer that over the tenant when present.
    const segments = url.pathname.split("/").filter(Boolean);
    const careersSegment = segments.find((segment) => /careers$/i.test(segment));
    const careersCompany = careersSegment
      ? slugToLabel(careersSegment.replace(/careers$/i, "").replace(/^-+|-+$/g, ""))
      : undefined;

    return {
      source: "ats:workday",
      fields: {
        role: role ?? pathRole(url.pathname),
        company: careersCompany ?? tenantCompany,
        location: location ?? pathLocation(url.pathname),
      },
    };
  },
};

function pathRole(pathname: string): string | undefined {
  const match = pathname.match(/\/job\/[^/]+\/([^/?#]+)/i);
  if (!match) return undefined;
  return slugToLabel(match[1]!.replace(/_[A-Z0-9]+$/i, ""));
}

function pathLocation(pathname: string): string | undefined {
  const match = pathname.match(/\/job\/([^/]+)\//i);
  if (!match) return undefined;
  return slugToLabel(match[1]!).replace(/,\s*United States/i, "");
}
