import assert from "node:assert/strict";
import {
  alternateDomainsForComGuess,
  companyInitials,
  companyLogoApiUrl,
  domainFromCompanyName,
  domainFromJobLink,
  isAtsVendorDomain,
  isValidCompanyDomain,
  normalizeCompanyDomain,
  resolveCompanyDomain,
  resolveCompanyDomainCandidates,
} from "@/lib/company-logo";
import { ApplicationSchema } from "@/lib/validators";

assert.equal(domainFromJobLink("https://www.tesla.com/careers/search/job/266962"), "tesla.com");
assert.equal(
  domainFromJobLink("https://job-boards.greenhouse.io/stripe/jobs/123"),
  "stripe.com",
);
assert.equal(isAtsVendorDomain("greenhouse.io"), true);
assert.equal(isAtsVendorDomain("job-boards.greenhouse.io"), true);
assert.equal(isAtsVendorDomain("workforcenow.adp.com"), true);
assert.equal(isAtsVendorDomain("https://myjobs.adp.com/example/jobs/123"), true);
assert.equal(isAtsVendorDomain("adp.com"), false);
assert.equal(isAtsVendorDomain("stripe.com"), false);
assert.equal(normalizeCompanyDomain("https://www.example.com/en/us/careers"), "example.com");
assert.equal(normalizeCompanyDomain("careers.example.co.uk/jobs/123"), "example.co.uk");
assert.equal(ApplicationSchema.shape.companyDomain.parse(""), "");
assert.equal(
  ApplicationSchema.shape.companyDomain.parse("https://www.example.com/en/us/careers"),
  "example.com",
);
assert.equal(
  ApplicationSchema.shape.companyDomain.safeParse(
    "https://workforcenow.adp.com/mascsr/default/mdf/recruitment.html",
  ).success,
  false,
);
assert.equal(domainFromCompanyName("Stripe"), "stripe.com");
assert.equal(domainFromCompanyName("HqO"), "hqo.com");
assert.equal(
  resolveCompanyDomain("Stripe", "https://job-boards.greenhouse.io/stripe/jobs/123"),
  "stripe.com",
);
assert.equal(resolveCompanyDomain("Tesla", "https://www.tesla.com/careers/search/job/1"), "tesla.com");
assert.equal(companyInitials("HqO"), "HqO");
assert.equal(companyInitials("FanDuel"), "FA");
assert.equal(
  companyLogoApiUrl({ company: "Stripe" }),
  "/api/company-logo?company=Stripe&domain=stripe.com",
);
assert.equal(
  companyLogoApiUrl({ company: "Unknown", companyDomain: "unknown.ai" }),
  "/api/company-logo?company=Unknown&verifiedDomain=1&domain=unknown.ai",
);
assert.equal(
  companyLogoApiUrl({
    company: "Acme",
    companyDomain: "",
    jobLink: "https://workforcenow.adp.com/mascsr/default/mdf/recruitment.html",
  }),
  undefined,
);
assert.equal(
  companyLogoApiUrl({ company: "Tesla", jobLink: "https://www.tesla.com/careers/search/job/1" }),
  "/api/company-logo?company=Tesla&jobLink=https%3A%2F%2Fwww.tesla.com%2Fcareers%2Fsearch%2Fjob%2F1&domain=tesla.com",
);
assert.equal(
  companyLogoApiUrl({
    company: "Acme",
    jobLink: "https://jobs.example-ats.test/acme/123",
    hiringOrgUrl: "https://acme.co.uk/careers",
  }),
  "/api/company-logo?company=Acme&jobLink=https%3A%2F%2Fjobs.example-ats.test%2Facme%2F123&hiringOrgUrl=https%3A%2F%2Facme.co.uk%2Fcareers&domain=acme.co.uk",
);

const tetrixAshby =
  "https://jobs.ashbyhq.com/tetrix/646bd017-ceaa-40b8-abde-193968616b7b?utm_source=linkedin";
assert.equal(domainFromJobLink(tetrixAshby), "tetrix.co");
assert.equal(
  companyLogoApiUrl({ company: "Tetrix", jobLink: tetrixAshby }),
  "/api/company-logo?company=Tetrix&jobLink=" +
    encodeURIComponent(tetrixAshby) +
    "&domain=tetrix.co",
);
assert.deepEqual(alternateDomainsForComGuess("tetrix.com"), ["tetrix.co", "tetrix.io", "tetrix.ai"]);
assert.deepEqual(alternateDomainsForComGuess("hqo.com"), []);

const onezeroBamboo =
  "https://onezero.bamboohr.com/careers/279?source=linkedin_premium";
assert.equal(domainFromJobLink(onezeroBamboo), "onezero.com");
assert.equal(
  resolveCompanyDomain("OneZero", onezeroBamboo),
  "onezero.com",
);
assert.notEqual(domainFromJobLink(onezeroBamboo), "bamboohr.com");

assert.equal(isValidCompanyDomain("stripe.com"), true);
assert.equal(isValidCompanyDomain("not a domain"), false);

assert.equal(
  domainFromJobLink("https://jobs.lever.co/shopreli/afdc11a0-ef14-4300-8614-7b98bda6df9d"),
  "shopreli.com",
);
assert.equal(domainFromCompanyName("Reli."), "shopreli.com");
assert.equal(
  resolveCompanyDomain("Reli.", "https://jobs.lever.co/shopreli/jobs/123"),
  "shopreli.com",
);

const tiktokUrl = "https://lifeattiktok.com/search/7639952887230155013?spread=XKM9ZXE";
assert.equal(domainFromJobLink(tiktokUrl), "tiktok.com");
assert.equal(
  companyLogoApiUrl({ company: "TikTok", jobLink: tiktokUrl }),
  "/api/company-logo?company=TikTok&jobLink=" +
    encodeURIComponent(tiktokUrl) +
    "&domain=tiktok.com",
);

assert.equal(
  domainFromJobLink("https://starbucks.eightfold.ai/careers/job/123?domain=starbucks.com"),
  "starbucks.com",
);
assert.equal(
  domainFromJobLink("https://jobs.ashbyhq.com/cartesia/646bd017-ceaa-40b8-abde-193968616b7b"),
  "cartesia.ai",
);
assert.equal(
  domainFromJobLink("https://apply.workable.com/lyv-health/j/123"),
  "lyvhealth.com",
);
assert.equal(
  domainFromJobLink("https://jobs.ashbyhq.com/unknown-startup/646bd017-ceaa-40b8-abde-193968616b7b"),
  undefined,
);
assert.deepEqual(
  resolveCompanyDomainCandidates({
    company: "Lyv",
    jobLink: "https://apply.workable.com/lyv-health/j/123",
  }),
  ["lyvhealth.com"],
);
assert.deepEqual(
  resolveCompanyDomainCandidates({
    company: "Cartesia",
    jobLink: "https://jobs.ashbyhq.com/cartesia/646bd017-ceaa-40b8-abde-193968616b7b",
  }),
  ["cartesia.ai"],
);
assert.equal(domainFromJobLink("https://careers.acme.co.uk/jobs/1"), "acme.co.uk");
assert.equal(
  domainFromJobLink("https://workforcenow.adp.com/mascsr/default/mdf/recruitment.html"),
  undefined,
);

console.log("company-logo tests passed");
