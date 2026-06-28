const ATS_VENDOR_DOMAINS = [
  "greenhouse.io",
  "lever.co",
  "ashbyhq.com",
  "rippling.com",
  "bamboohr.com",
  "myworkdayjobs.com",
  "smartrecruiters.com",
  "linkedin.com",
  "indeed.com",
  "eightfold.ai",
  "icims.com",
  "taleo.net",
  "workable.com",
  "jobvite.com",
  "teamtailor.com",
  "recruitee.com",
  "breezy.hr",
  "jazz.co",
  "ukg.com",
  "comeet.com",
  "pinpointhq.com",
  "personio.com",
  "workforcenow.adp.com",
  "myjobs.adp.com",
];

const COMMON_SECOND_LEVEL_SUFFIXES = new Set([
  "co.uk",
  "com.au",
  "com.br",
  "com.mx",
  "com.sg",
  "com.tr",
  "com.tw",
  "co.jp",
  "co.kr",
  "co.in",
  "co.nz",
  "co.za",
  "org.uk",
  "net.au",
]);

const BRAND_DOMAINS: Record<string, string> = {
  tesla: "tesla.com",
  meta: "meta.com",
  facebook: "meta.com",
  google: "google.com",
  alphabet: "abc.xyz",
  apple: "apple.com",
  microsoft: "microsoft.com",
  amazon: "amazon.com",
  netflix: "netflix.com",
  stripe: "stripe.com",
  notion: "notion.so",
  openai: "openai.com",
  anthropic: "anthropic.com",
  fanduel: "fanduel.com",
  alpaca: "alpaca.markets",
  sitreps: "sitreps.io",
  hqo: "hqo.com",
  reebelo: "reebelo.com",
  acme: "acme.com",
  reli: "shopreli.com",
  shopreli: "shopreli.com",
  tiktok: "tiktok.com",
  tetrix: "tetrix.co",
  onezero: "onezero.com",
  bytedance: "bytedance.com",
  starbucks: "starbucks.com",
  cartesia: "cartesia.ai",
  lyvhealth: "lyvhealth.com",
};

const DOMAIN_PATTERN =
  /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

export function isValidCompanyDomain(value: string): boolean {
  const domain = value.trim().toLowerCase();
  if (!domain || domain.length > 253) return false;
  if (domain.includes("/") || domain.includes("@") || domain.includes(":")) return false;
  return DOMAIN_PATTERN.test(domain);
}

function normalizeHostname(value: string): string {
  return value.trim().toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
}

export function normalizeCompanyDomain(value: string): string {
  const raw = value.trim();
  if (!raw) return "";

  const candidate = /^https?:\/\//i.test(raw)
    ? raw
    : `https://${raw.replace(/^\/\//, "")}`;

  try {
    const parsed = new URL(candidate);
    const hostname = normalizeHostname(parsed.hostname);
    return registrableDomain(hostname) ?? hostname;
  } catch {
    return normalizeHostname(raw);
  }
}

export function isAtsVendorDomain(value: string): boolean {
  const raw = value.trim();
  let normalized = normalizeHostname(raw);

  try {
    const parsed = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    normalized = normalizeHostname(parsed.hostname);
  } catch {
    /* keep the normalized raw value */
  }

  return ATS_VENDOR_DOMAINS.some(
    (domain) => normalized === domain || normalized.endsWith(`.${domain}`),
  );
}

function isSafeCompanyDomain(value: string | undefined): value is string {
  return Boolean(value && isValidCompanyDomain(value) && !isAtsVendorDomain(value));
}

function registrableDomain(host: string): string | undefined {
  const normalized = normalizeHostname(host);
  const parts = normalized.split(".").filter(Boolean);
  if (parts.length < 2) return undefined;

  const lastTwo = parts.slice(-2).join(".");
  if (COMMON_SECOND_LEVEL_SUFFIXES.has(lastTwo) && parts.length >= 3) {
    return parts.slice(-3).join(".");
  }

  return lastTwo;
}

function domainFromCorporateHost(host: string): string | undefined {
  const domain = registrableDomain(host);
  return isSafeCompanyDomain(domain) ? domain : undefined;
}

function domainFromBrandedCareersHost(host: string): string | undefined {
  const normalized = host.toLowerCase();

  const lifeAtMatch = normalized.match(/^lifeat([a-z0-9-]+)\.com$/);
  if (lifeAtMatch?.[1]) {
    const slug = lifeAtMatch[1];
    if (BRAND_DOMAINS[slug]) return BRAND_DOMAINS[slug];
    const candidate = `${slug}.com`;
    return isValidCompanyDomain(candidate) ? candidate : undefined;
  }

  return undefined;
}

function domainFromTenantSlug(slug: string): string | undefined {
  const normalized = slug.toLowerCase().replace(/[^a-z0-9]+/g, "");
  if (!normalized || /^\d+$/.test(normalized)) return undefined;
  if (["www", "app", "careers", "jobs"].includes(normalized)) return undefined;

  if (BRAND_DOMAINS[normalized]) return BRAND_DOMAINS[normalized];
  return undefined;
}

function tenantFromAtsSubdomain(host: string): string | undefined {
  const normalized = host.toLowerCase();

  for (const suffix of ["bamboohr.com", "greenhouse.io", "eightfold.ai", "icims.com"]) {
    const suffixWithDot = `.${suffix}`;
    if (!normalized.endsWith(suffixWithDot)) continue;

    const tenant = normalized.slice(0, -suffixWithDot.length);
    if (!tenant || tenant.includes(".")) continue;
    if (["boards", "job-boards", "jobs", "apply", "careers"].includes(tenant)) continue;
    return tenant;
  }

  return undefined;
}

function tenantFromAtsPath(host: string, segments: string[]): string | undefined {
  if (host.includes("lever.co")) return segments[0];
  if (host.includes("greenhouse.io")) return segments[0];
  if (host.includes("ashbyhq.com")) return segments[0];
  if (host.includes("rippling.com")) return segments[0];
  if (host.includes("smartrecruiters.com")) return segments[0];
  if (host.includes("workable.com")) return segments[0];
  if (host.includes("jobvite.com")) return segments[0];
  if (host.includes("teamtailor.com")) return segments[0];
  if (host.includes("recruitee.com")) return segments[0];
  if (host.includes("breezy.hr")) return segments[0];
  if (host.includes("comeet.com")) return segments[0];
  if (host.includes("pinpointhq.com")) return segments[0];
  if (host.includes("personio.com")) return segments[0];
  return undefined;
}

function domainHintFromJobLink(parsed: URL): string | undefined {
  if (!isAtsVendorDomain(parsed.hostname)) return undefined;

  for (const key of ["domain", "company_domain", "companyDomain"]) {
    const value = parsed.searchParams.get(key);
    if (!value) continue;
    const normalized = normalizeCompanyDomain(value);
    if (isSafeCompanyDomain(normalized)) return normalized;
  }

  return undefined;
}

function domainFromHiringOrgUrl(value: string | null | undefined): string | undefined {
  if (!value?.trim()) return undefined;

  try {
    const raw = value.trim();
    const parsed = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return domainFromCorporateHost(parsed.hostname);
  } catch {
    return undefined;
  }
}

function pushDomain(out: string[], seen: Set<string>, domain: string | undefined): void {
  if (!isSafeCompanyDomain(domain)) return;
  const normalized = normalizeCompanyDomain(domain);
  if (seen.has(normalized)) return;
  seen.add(normalized);
  out.push(normalized);
}

export function resolveCompanyDomainCandidates(params: {
  company?: string | null;
  jobLink?: string | null;
  hiringOrgUrl?: string | null;
  explicitDomain?: string | null;
}): string[] {
  const candidates: string[] = [];
  const seen = new Set<string>();

  pushDomain(candidates, seen, params.explicitDomain ?? undefined);
  pushDomain(candidates, seen, domainFromHiringOrgUrl(params.hiringOrgUrl));

  const companySlug = params.company ? slugFromCompanyName(params.company) : "";

  if (params.jobLink?.trim()) {
    try {
      const parsed = new URL(params.jobLink.trim());
      const host = parsed.hostname.toLowerCase();
      const segments = parsed.pathname.split("/").filter(Boolean);

      pushDomain(candidates, seen, domainHintFromJobLink(parsed));

      if (isAtsVendorDomain(host)) {
        const tenant = tenantFromAtsSubdomain(host) ?? tenantFromAtsPath(host, segments);
        pushDomain(candidates, seen, tenant ? domainFromTenantSlug(tenant) : undefined);
      } else {
        pushDomain(candidates, seen, domainFromBrandedCareersHost(host));
        pushDomain(candidates, seen, domainFromCorporateHost(host));
      }
    } catch {
      /* ignore malformed URLs */
    }
  }

  if (companySlug && BRAND_DOMAINS[companySlug]) {
    pushDomain(candidates, seen, BRAND_DOMAINS[companySlug]);
  }

  return candidates;
}

export function domainFromJobLink(jobLink: string | null | undefined): string | undefined {
  return resolveCompanyDomainCandidates({ jobLink })[0];
}

function slugFromCompanyName(company: string): string {
  return company
    .trim()
    .toLowerCase()
    .replace(/['’.]/g, "")
    .replace(/\b(inc|llc|corp|corporation|company|co|ltd|limited|group|holdings)\b/g, " ")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

export function domainFromCompanyName(company: string): string | undefined {
  const trimmed = company.trim();
  if (!trimmed) return undefined;

  const slug = slugFromCompanyName(trimmed);
  if (slug.length < 2) return undefined;

  if (BRAND_DOMAINS[slug]) return BRAND_DOMAINS[slug];

  const guessed = `${slug}.com`;
  return isSafeCompanyDomain(guessed) ? guessed : undefined;
}

export function resolveCompanyDomain(
  company: string,
  jobLink?: string | null,
): string | undefined {
  return resolveCompanyDomainCandidates({ company, jobLink })[0] ?? domainFromCompanyName(company);
}

export function alternateDomainsForComGuess(domain: string): string[] {
  const normalized = normalizeCompanyDomain(domain);
  const match = normalized.match(/^([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9]?))\.com$/);
  const slug = match?.[1];
  if (!slug || slug.length < 4) return [];

  return (["co", "io", "ai"] as const)
    .map((tld) => `${slug}.${tld}`)
    .filter(isValidCompanyDomain);
}

export function companyLogoApiUrl(params: {
  company: string;
  jobLink?: string | null;
  hiringOrgUrl?: string | null;
  companyDomain?: string | null;
}): string | undefined {
  const company = params.company.trim();
  const jobLink = params.jobLink?.trim();
  const hiringOrgUrl = params.hiringOrgUrl?.trim();
  if (params.companyDomain === "") return undefined;
  const companyDomain = params.companyDomain
    ? normalizeCompanyDomain(params.companyDomain)
    : undefined;

  const qs = new URLSearchParams();
  if (company) qs.set("company", company);
  if (jobLink) qs.set("jobLink", jobLink);
  if (hiringOrgUrl) qs.set("hiringOrgUrl", hiringOrgUrl);
  if (companyDomain) qs.set("verifiedDomain", "1");

  const domain = resolveCompanyDomainCandidates({
    company,
    jobLink,
    hiringOrgUrl,
    explicitDomain: companyDomain,
  })[0];
  if (domain) qs.set("domain", domain);

  return `/api/company-logo?${qs.toString()}`;
}

export function companyInitials(company: string): string {
  const trimmed = company.trim();
  if (!trimmed) return "?";

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    const alnum = [...words[0]!.replace(/[^a-zA-Z0-9]/g, "")];
    if (alnum.length === 0) return "?";
    if (alnum.length <= 3 && /[A-Z]/.test(words[0]!)) {
      return alnum.join("").slice(0, 3);
    }
    return alnum.slice(0, 2).join("").toUpperCase();
  }

  return words
    .slice(0, 2)
    .map((word) => word.replace(/[^a-zA-Z0-9]/g, "").charAt(0))
    .join("")
    .toUpperCase();
}
