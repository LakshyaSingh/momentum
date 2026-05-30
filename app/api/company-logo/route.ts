import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { lookupConfidentCompanyDomainFromName } from "@/lib/company-lookup";
import {
  isAtsVendorDomain,
  isValidCompanyDomain,
  normalizeCompanyDomain,
  resolveCompanyDomainCandidates,
} from "@/lib/company-logo";

export const runtime = "nodejs";

const CACHE_MAX_AGE = 60 * 60 * 24 * 7;
const STALE_WHILE_REVALIDATE = 60 * 60 * 24;
const MIN_BODY_BYTES = 1024;
const MIN_VERIFIED_BODY_BYTES = 32;

const PLACEHOLDER_HASHES = new Set([
  // DuckDuckGo generic globe icon.
  "e5db88ea2322863ca17817b99d60006c625a31cff0dad49cf05d3c6d16a75c17",
  // Google s2 generic stylized "S" placeholder.
  "cfe7012e619cad3303d88676776006bef3fcb7ec68e3b99b53eabce8b47fb38e",
]);

const LOGO_SOURCES = [
  (domain: string) => `https://logo.clearbit.com/${domain}`,
  (domain: string) => `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
  (domain: string) => `https://icons.duckduckgo.com/ip3/${domain}.ico`,
];

async function fetchLogo(
  domain: string,
  options: { verifiedDomain?: boolean } = {},
): Promise<{ body: ArrayBuffer; contentType: string } | null> {
  const minBodyBytes = options.verifiedDomain ? MIN_VERIFIED_BODY_BYTES : MIN_BODY_BYTES;

  for (const buildUrl of LOGO_SOURCES) {
    const url = buildUrl(domain);

    try {
      const response = await fetch(url, {
        redirect: "follow",
        headers: {
          Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
          "User-Agent":
            "Mozilla/5.0 (compatible; MomentumJobTracker/1.0; +https://job-tracker-alpha-blush.vercel.app)",
        },
        next: { revalidate: CACHE_MAX_AGE },
      });

      if (!response.ok) continue;

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.startsWith("image/")) continue;

      const body = await response.arrayBuffer();
      if (body.byteLength < minBodyBytes) continue;

      const hash = createHash("sha256").update(Buffer.from(body)).digest("hex");
      if (PLACEHOLDER_HASHES.has(hash)) continue;

      return { body, contentType };
    } catch {
      continue;
    }
  }

  return null;
}

async function fetchLogoFromDomains(
  domains: string[],
  verifiedDomain?: string,
): Promise<{ body: ArrayBuffer; contentType: string } | null> {
  const tried = new Set<string>();
  for (const candidate of domains) {
    const normalized = normalizeCompanyDomain(candidate);
    if (!isValidCompanyDomain(normalized) || isAtsVendorDomain(normalized) || tried.has(normalized)) {
      continue;
    }
    tried.add(normalized);

    const logo = await fetchLogo(normalized, { verifiedDomain: normalized === verifiedDomain });
    if (logo) return logo;
  }

  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const domainParam = searchParams.get("domain")?.trim();
  const company = searchParams.get("company")?.trim();
  const jobLink = searchParams.get("jobLink")?.trim();
  const hiringOrgUrl = searchParams.get("hiringOrgUrl")?.trim();
  const verifiedDomain =
    searchParams.get("verifiedDomain") === "1" && domainParam
      ? normalizeCompanyDomain(domainParam)
      : undefined;

  const domains = resolveCompanyDomainCandidates({
    company,
    jobLink,
    hiringOrgUrl,
    explicitDomain: domainParam,
  });

  if (company?.trim()) {
    const fromName = await lookupConfidentCompanyDomainFromName(company.trim());
    if (fromName) domains.push(fromName);
  }

  if (domains.length === 0) {
    return NextResponse.json({ error: "Missing company or domain." }, { status: 400 });
  }

  const logo = await fetchLogoFromDomains(domains, verifiedDomain);
  if (!logo) {
    return NextResponse.json({ error: "Logo not found." }, { status: 404 });
  }

  return new NextResponse(logo.body, {
    status: 200,
    headers: {
      "Content-Type": logo.contentType,
      "Cache-Control": `public, max-age=${CACHE_MAX_AGE}, stale-while-revalidate=${STALE_WHILE_REVALIDATE}`,
    },
  });
}
