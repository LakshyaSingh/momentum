import { ashbyAdapter } from "./ashby";
import { bamboohrAdapter } from "./bamboohr";
import { greenhouseAdapter } from "./greenhouse";
import { leverAdapter } from "./lever";
import { linkedinAdapter } from "./linkedin";
import { ripplingAdapter } from "./rippling";
import { smartrecruitersAdapter } from "./smartrecruiters";
import { workdayAdapter } from "./workday";
import type { AtsAdapter } from "./types";

/**
 * Ordered list of platform-specific adapters. The first adapter whose
 * `match()` returns true for the URL is used (only one runs per request).
 */
export const ATS_ADAPTERS: readonly AtsAdapter[] = [
  greenhouseAdapter,
  leverAdapter,
  ashbyAdapter,
  workdayAdapter,
  bamboohrAdapter,
  smartrecruitersAdapter,
  ripplingAdapter,
  linkedinAdapter,
];

/** Find the first adapter that matches the given URL. */
export function findAdapter(url: URL): AtsAdapter | null {
  for (const adapter of ATS_ADAPTERS) {
    if (adapter.match(url)) return adapter;
  }
  return null;
}

/** Map an adapter source to a human-readable platform label for diagnostics. */
export function platformLabel(source: string): string {
  switch (source) {
    case "ats:greenhouse":
      return "greenhouse";
    case "ats:lever":
      return "lever";
    case "ats:ashby":
      return "ashby";
    case "ats:workday":
      return "workday";
    case "ats:bamboohr":
      return "bamboohr";
    case "ats:smartrecruiters":
      return "smartrecruiters";
    case "ats:rippling":
      return "rippling";
    case "ats:linkedin":
      return "linkedin";
    default:
      return "generic";
  }
}
