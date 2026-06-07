import assert from "node:assert/strict";
import { extractJobFieldsFromHtml, extractJobFieldsFromUrl } from "@/lib/job-link/extract-fields";
import { extractLocationFromText, extractSalaryFromText } from "@/lib/job-link/text-patterns";
import { isUsefulSalary, normalizeSalary } from "@/lib/job-link/field-validators";
import { parseTitleTag } from "@/lib/job-link/text-utils";
import { extractUrlFields } from "@/lib/job-link/url-heuristics";
import {
  formatSalaryDisplay,
  parseSalary,
  structuredSalaryFromJsonLd,
} from "@/lib/job-link/salary";
import {
  isAtsVendorName,
  validateCompany,
  validateRole,
  validateLocation,
  validateSalary,
  companyUrlAgreement,
} from "@/lib/job-link/validation";

const greenhouseHtml = `
<!doctype html>
<html>
  <head>
    <title>Senior Software Engineer - Acme Corp</title>
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "JobPosting",
        "title": "Senior Software Engineer",
        "hiringOrganization": { "@type": "Organization", "name": "Acme Corp", "url": "https://acme.co.uk" },
        "jobLocationType": "TELECOMMUTE",
        "baseSalary": {
          "@type": "MonetaryAmount",
          "currency": "USD",
          "value": { "@type": "QuantitativeValue", "minValue": 160000, "maxValue": 190000, "unitText": "YEAR" }
        },
        "contactPoint": { "@type": "ContactPoint", "name": "Alex Kim" },
        "description": "Build delightful products."
      }
    </script>
  </head>
  <body></body>
</html>
`;

const microdataHtml = `
<html>
  <body>
    <div itemscope itemtype="https://schema.org/JobPosting">
      <h1 itemprop="title">Backend Engineer</h1>
      <span itemprop="hiringOrganization" itemscope itemtype="https://schema.org/Organization">
        <span itemprop="name">Stripe</span>
      </span>
      <span itemprop="jobLocation">San Francisco, CA</span>
      <span itemprop="baseSalary">$180,000 - $220,000</span>
    </div>
  </body>
</html>
`;

const jsonLd = extractJobFieldsFromHtml(
  greenhouseHtml,
  "https://boards.greenhouse.io/acme/jobs/123",
);
assert.equal(jsonLd.ok, true);
if (jsonLd.ok) {
  assert.equal(jsonLd.fields.role, "Senior Software Engineer");
  assert.equal(jsonLd.fields.company, "Acme Corp");
  assert.equal(jsonLd.fields.hiringOrgUrl, "https://acme.co.uk");
  assert.equal(jsonLd.fields.location, "Remote");
  assert.match(jsonLd.fields.salary ?? "", /160,000/);
  assert.equal(jsonLd.fields.recruiter, "Alex Kim");
  assert.equal(jsonLd.source, "json-ld");
}

const microdata = extractJobFieldsFromHtml(microdataHtml, "https://example.com/jobs/1");
assert.equal(microdata.ok, true);
if (microdata.ok) {
  assert.equal(microdata.fields.role, "Backend Engineer");
  assert.equal(microdata.fields.company, "Stripe");
}

const title = parseTitleTag("Product Manager | Stripe");
assert.equal(title.role, "Product Manager");
assert.equal(title.company, "Stripe");

const joinTeamTitle = parseTitleTag("Product Manager | Join the team!");
assert.equal(joinTeamTitle.role, "Product Manager");
assert.equal(joinTeamTitle.company, undefined);

const salary = extractSalaryFromText("We offer $120,000 - $150,000 per year plus equity.");
assert.match(salary ?? "", /120,000/);

const kSalary = extractSalaryFromText("Base Salary: $140K–$170K");
assert.match(kSalary ?? "", /140K/i);
assert.match(kSalary ?? "", /170K/i);

const greenhouseKSalaryHtml = `
<html>
  <head>
    <title>Job Application for Product Manager at Sitreps</title>
    <meta property="og:title" content="Product Manager" />
    <meta property="og:description" content="Philadelphia, PA" />
  </head>
  <body>
    <h1>Product Manager</h1>
    <h2>Compensation</h2>
    <ul>
      <li>Base Salary: $140K–$170K</li>
      <li>Equity: meaningful early-employee equity grant</li>
    </ul>
  </body>
</html>
`;

const greenhouseK = extractJobFieldsFromHtml(
  greenhouseKSalaryHtml,
  "https://job-boards.greenhouse.io/sitrepsllc/jobs/4257503009",
);
assert.equal(greenhouseK.ok, true);
if (greenhouseK.ok) {
  assert.equal(greenhouseK.fields.role, "Product Manager");
  assert.equal(greenhouseK.fields.company, "Sitreps");
  assert.equal(greenhouseK.fields.location, "Philadelphia, PA");
  assert.match(greenhouseK.fields.salary ?? "", /\$140,000/);
  assert.match(greenhouseK.fields.salary ?? "", /\$170,000/);
}

const sitrepsLocationHtml = `
<html>
  <head>
    <title>Job Application for Product Manager at Sitreps</title>
    <meta property="og:title" content="Product Manager" />
    <meta property="og:description" content="Philadelphia, PA" />
  </head>
  <body>
    <h1>Product Manager</h1>
    <h2>Location</h2>
    <p>Philadelphia preferred, with an in-person presence expected the majority of the week.</p>
    <p>Remote-only candidates are not a fit for this role.</p>
  </body>
</html>
`;

const sitrepsLocation = extractJobFieldsFromHtml(
  sitrepsLocationHtml,
  "https://job-boards.greenhouse.io/sitrepsllc/jobs/4257503009",
);
assert.equal(sitrepsLocation.ok, true);
if (sitrepsLocation.ok) {
  assert.equal(sitrepsLocation.fields.location, "Philadelphia, PA");
}

assert.equal(
  extractLocationFromText("Remote-only candidates are not a fit for this role."),
  undefined,
);
assert.equal(extractLocationFromText("Philadelphia, PAApplyProduct Manager"), "Philadelphia, PA");

const splitSalary = normalizeSalary(
  "The applicable salary range for this position is $94,000 - $129, 250 USD",
);
assert.match(splitSalary ?? "", /\$94,000/);
assert.match(splitSalary ?? "", /\$129,250/);

const fanduelHtml = `
<html>
  <head>
    <title>Product Manager - FanDuel Careers</title>
    <meta property="og:title" content="Product Manager - FanDuel Careers" />
    <meta property="og:description" content="THE POSITIONOur roster has an opening with your name on it The Product Manager is responsible for the planning, prioritization, and execution of successful products." />
  </head>
  <body>
    <h1>Product Manager</h1>
    <span class="job-location">New York City</span>
    <p>The applicable salary range for this position is $94,000 - $129, 250 USD, which is dependent on a variety of factors.</p>
  </body>
</html>
`;

const fanduel = extractJobFieldsFromHtml(
  fanduelHtml,
  "https://www.fanduel.careers/jobs/fanduel/product-manager-2/?gh_jid=7954862",
);
assert.equal(fanduel.ok, true);
if (fanduel.ok) {
  assert.equal(fanduel.fields.role, "Product Manager");
  assert.equal(fanduel.fields.company, "FanDuel");
  assert.equal(fanduel.fields.location, "New York City");
  assert.match(fanduel.fields.salary ?? "", /\$94,000/);
  assert.match(fanduel.fields.salary ?? "", /\$129,250/);
  assert.equal(fanduel.fields.notes, undefined);
}

const alpacaHtml = `
<html>
  <head>
    <title>Job Application for Product Manager, Accounts at Alpaca</title>
    <meta property="og:title" content="Product Manager, Accounts" />
    <meta property="og:description" content="Remote - North America (EST)" />
  </head>
  <body>
    <h1>Product Manager, Accounts</h1>
    <p>Our recent Series D funding round brought our total investment to over $320 million, fueling our ambitious vision.</p>
    <li>New Hire Home-Office Setup: One-time USD $500</li>
    <li>Monthly Stipend: USD $150 per month via a Brex Card</li>
  </body>
</html>
`;

const alpaca = extractJobFieldsFromHtml(
  alpacaHtml,
  "https://job-boards.greenhouse.io/alpaca/jobs/6002028004",
);
assert.equal(alpaca.ok, true);
if (alpaca.ok) {
  assert.equal(alpaca.fields.role, "Product Manager, Accounts");
  assert.equal(alpaca.fields.company, "Alpaca");
  assert.equal(alpaca.fields.location, "Remote - North America (EST)");
  assert.equal(alpaca.fields.salary, undefined);
  assert.equal(alpaca.fields.notes, undefined);
}

assert.equal(isUsefulSalary("$320"), false);
assert.equal(isUsefulSalary("total investment to over $320 million"), false);
assert.equal(extractSalaryFromText("total investment to over $320 million"), undefined);

const zeroSalary = extractSalaryFromText("Salary: $0 - $0 per year");
assert.equal(zeroSalary, undefined);

const zeroJson = extractJobFieldsFromHtml(
  `<html><head><script type="application/ld+json">${JSON.stringify({
    "@type": "JobPosting",
    title: "Engineer",
    hiringOrganization: { name: "Acme" },
    baseSalary: { currency: "USD", value: { minValue: 0, maxValue: 0, unitText: "YEAR" } },
  })}</script></head></html>`,
  "https://example.com/job",
);
assert.equal(zeroJson.ok, true);
if (zeroJson.ok) {
  assert.equal(zeroJson.fields.salary, undefined);
}

const workday = extractUrlFields(
  "https://company.myworkdayjobs.com/en-US/AcmeCareers/job/San-Francisco-CA-United-States/Senior-Engineer_JR123",
);
assert.equal(workday.company, "Acme");
assert.match(workday.role ?? "", /Senior Engineer/i);

const linkedInHtml = `
<html>
  <head>
    <title>Reebelo hiring Associate Product Manager (eCommerce / marketplace) in United States | LinkedIn</title>
    <meta property="og:title" content="Reebelo hiring Associate Product Manager (eCommerce / marketplace) in United States | LinkedIn" />
    <meta property="og:description" content="Posted 8:56:31 AM. Associate Product ManagerCompensation: $110,000 - $130,000 base salary + 10% bonus + 4% 401(k)…See this and similar jobs on LinkedIn." />
  </head>
  <body>
    <div class="location">Clear text</div>
    <p>talk with your recruiter to learn more.</p>
    <a class="base-card__full-link" href="https://www.linkedin.com/in/bridgette-alonzo-stewart">
      <span class="sr-only">Bridgette Alonzo-Stewart</span>
    </a>
  </body>
</html>
`;

const linkedIn = extractJobFieldsFromHtml(
  linkedInHtml,
  "https://www.linkedin.com/jobs/view/4418925796/",
);
assert.equal(linkedIn.ok, true);
if (linkedIn.ok) {
  assert.equal(linkedIn.fields.company, "Reebelo");
  assert.equal(linkedIn.fields.role, "Associate Product Manager (eCommerce / marketplace)");
  assert.equal(linkedIn.fields.location, "United States");
  assert.equal(linkedIn.fields.recruiter, "Bridgette Alonzo-Stewart");
  assert.match(linkedIn.fields.salary ?? "", /\$110,000/);
  assert.match(linkedIn.fields.salary ?? "", /\$130,000/);
  assert.doesNotMatch(linkedIn.fields.notes ?? "", /Posted 8:56:31 AM/i);
  assert.doesNotMatch(linkedIn.fields.notes ?? "", /See this and similar jobs on LinkedIn/i);
}

const urlFallback = extractJobFieldsFromHtml(
  "<html><head><title>Apply</title></head></html>",
  "https://boards.greenhouse.io/notion/jobs/456",
);
assert.equal(urlFallback.ok, true);
if (urlFallback.ok) {
  assert.equal(urlFallback.fields.company, "Notion");
}

const ripplingHtml = `
<html>
  <head>
    <title>Product Manager</title>
    <meta property="og:title" content="Product Manager | Join the team!" />
    <meta property="og:description" content="About the role We are seeking a Product Manager to join our growing Product team." />
  </head>
  <body>
    <script id="__NEXT_DATA__" type="application/json">${JSON.stringify({
      props: {
        pageProps: {
          apiData: {
            jobPost: {
              name: "Product Manager",
              description: {
                company: "<p><b>About HqO</b> HqO is connecting real estate to the people.</p>",
              },
            },
            jobBoard: { slug: "hqo" },
            workLocations: ["Boston, MA"],
            payRangeDetails: [],
          },
          title: "Title",
          company: "Company",
          location: "Location",
        },
      },
    })}</script>
  </body>
</html>
`;

const rippling = extractJobFieldsFromHtml(
  ripplingHtml,
  "https://ats.rippling.com/hqo/jobs/ac970f88-1510-46d8-b68b-f60036e7185a",
);
assert.equal(rippling.ok, true);
if (rippling.ok) {
  assert.equal(rippling.fields.role, "Product Manager");
  assert.equal(rippling.fields.company, "HqO");
  assert.equal(rippling.fields.location, "Boston, MA");
  assert.equal(rippling.fields.salary, undefined);
  assert.equal(rippling.fields.notes, undefined);
  assert.equal(rippling.source, "rippling");
}

const ripplingUrl = extractUrlFields(
  "https://ats.rippling.com/hqo/jobs/ac970f88-1510-46d8-b68b-f60036e7185a",
);
assert.equal(ripplingUrl.company, "Hqo");

const teslaUrl = extractUrlFields(
  "https://www.tesla.com/careers/search/job/266962?source=LinkedIn",
);
assert.equal(teslaUrl.company, "Tesla");
assert.equal(teslaUrl.role, undefined);

const microsoftUrl = extractUrlFields("https://www.microsoft.com/en-us/careers");
assert.equal(microsoftUrl.company, "Microsoft");

const teslaFallback = extractJobFieldsFromUrl(
  "https://www.tesla.com/careers/search/job/266962?source=LinkedIn",
);
assert.equal(teslaFallback.ok, true);
if (teslaFallback.ok) {
  assert.equal(teslaFallback.fields.company, "Tesla");
  assert.equal(teslaFallback.source, "url");
}

// ---------------------------------------------------------------------------
// Structured salary parser
// ---------------------------------------------------------------------------

const yearlyRange = parseSalary("Compensation: $120,000 - $150,000 per year + equity");
assert.ok(yearlyRange, "expected yearly range to parse");
assert.equal(yearlyRange!.min, 120_000);
assert.equal(yearlyRange!.max, 150_000);
assert.equal(yearlyRange!.currency, "USD");
assert.equal(yearlyRange!.interval, "yearly");
assert.equal(yearlyRange!.display, "$120,000–$150,000");

const hourlyRange = parseSalary("Pay range: $35 - $45/hr");
assert.ok(hourlyRange);
assert.equal(hourlyRange!.interval, "hourly");
assert.equal(hourlyRange!.min, 35);
assert.equal(hourlyRange!.max, 45);
assert.match(hourlyRange!.display, /\/hr/);

const kRange = parseSalary("Salary: $140K–$170K/yr");
assert.ok(kRange);
assert.equal(kRange!.min, 140_000);
assert.equal(kRange!.max, 170_000);

const euroRange = parseSalary("Compensation: €60,000 - €80,000 per year");
assert.ok(euroRange);
assert.equal(euroRange!.currency, "EUR");
assert.equal(euroRange!.min, 60_000);

const fundingNoise = parseSalary("Series B raised $50M valuation - $200M");
assert.equal(fundingNoise, null);

const stipendNoise = parseSalary("Monthly stipend: $150 - $250");
assert.equal(stipendNoise, null);

const tooSmall = parseSalary("Salary: $5,000 - $9,000 per year");
assert.equal(tooSmall, null, "below plausibility band must be rejected");

const tooBigRatio = parseSalary("Total comp $50,000 - $5,000,000");
assert.equal(tooBigRatio, null, "10x ratio must be rejected as noise");

const jsonLdSalary = structuredSalaryFromJsonLd({
  currency: "USD",
  unitText: "YEAR",
  value: { minValue: 180_000, maxValue: 240_000, unitText: "YEAR" },
});
assert.ok(jsonLdSalary);
assert.equal(jsonLdSalary!.min, 180_000);
assert.equal(jsonLdSalary!.max, 240_000);
assert.equal(jsonLdSalary!.interval, "yearly");

const jsonLdSingle = structuredSalaryFromJsonLd({
  currency: "USD",
  unitText: "YEAR",
  value: 95_000,
});
assert.ok(jsonLdSingle);
assert.equal(jsonLdSingle!.min, 95_000);
assert.equal(jsonLdSingle!.display, "$95,000");

const jsonLdHourly = structuredSalaryFromJsonLd({
  currency: "USD",
  unitText: "HOUR",
  value: { minValue: 30, maxValue: 45 },
});
assert.ok(jsonLdHourly);
assert.equal(jsonLdHourly!.interval, "hourly");

assert.equal(
  formatSalaryDisplay({ min: 100_000, max: 100_000, currency: "USD", interval: "yearly", display: "" }),
  "$100,000",
);

// ---------------------------------------------------------------------------
// Company validation: ATS vendors blocked, generic strings dropped
// ---------------------------------------------------------------------------

assert.equal(isAtsVendorName("Greenhouse"), true);
// "Workday Inc." normalizes to "workday" which IS the ATS vendor name.
// This is the desired behavior — if someone is actually applying to Workday,
// they can edit the field manually after auto-fill.
assert.equal(isAtsVendorName("Workday Inc."), true);
assert.equal(isAtsVendorName("WORKDAY"), true);
assert.equal(isAtsVendorName("LinkedIn"), true);
assert.equal(isAtsVendorName("Stripe"), false);

assert.equal(validateCompany("Greenhouse"), null);
assert.equal(validateCompany("Stripe"), "Stripe");
assert.equal(validateCompany("123"), null);
assert.equal(validateCompany("https://stripe.com"), null);
assert.equal(validateCompany(undefined), null);

assert.equal(validateRole("Careers", {}), null);
assert.equal(validateRole("Apply Now", {}), null);
assert.equal(validateRole("Senior Engineer", {}), "Senior Engineer");
assert.equal(validateRole("Stripe", { company: "Stripe" }), null);

assert.equal(validateLocation("location"), null);
assert.equal(validateLocation("Remote"), "Remote");
assert.equal(validateLocation("San Francisco, CA"), "San Francisco, CA");

assert.equal(validateSalary("Series B raised $50M"), null);
assert.equal(validateSalary("$120,000 - $150,000 per year"), "$120,000–$150,000");

assert.equal(companyUrlAgreement("Stripe", "https://boards.greenhouse.io/stripe/jobs/123"), 1.1);
assert.equal(
  companyUrlAgreement("Acme", "https://boards.greenhouse.io/totallydifferent/jobs/1"),
  1,
);

// ---------------------------------------------------------------------------
// ATS adapter: Greenhouse DOM company beats URL slug
// ---------------------------------------------------------------------------

const greenhouseDomHtml = `
<html>
  <head><title>Job Application for Staff Engineer at Acme Corp</title></head>
  <body>
    <div id="header">
      <h1>Staff Engineer</h1>
      <div class="company-name">Acme Corp</div>
    </div>
    <span class="location">New York, NY</span>
  </body>
</html>
`;

const greenhouseDomResult = extractJobFieldsFromHtml(
  greenhouseDomHtml,
  "https://boards.greenhouse.io/acme/jobs/123",
);
assert.equal(greenhouseDomResult.ok, true);
if (greenhouseDomResult.ok) {
  assert.equal(greenhouseDomResult.fields.role, "Staff Engineer");
  assert.equal(greenhouseDomResult.fields.company, "Acme Corp");
  assert.equal(greenhouseDomResult.fields.location, "New York, NY");
}

// ---------------------------------------------------------------------------
// ATS vendor name from og:site_name does NOT become company
// ---------------------------------------------------------------------------

const ogVendorHtml = `
<html>
  <head>
    <title>Senior Designer - Stripe</title>
    <meta property="og:title" content="Senior Designer at Stripe" />
    <meta property="og:site_name" content="Greenhouse" />
  </head>
  <body>
    <h1>Senior Designer</h1>
  </body>
</html>
`;

const ogVendor = extractJobFieldsFromHtml(
  ogVendorHtml,
  "https://boards.greenhouse.io/stripe/jobs/456",
);
assert.equal(ogVendor.ok, true);
if (ogVendor.ok) {
  assert.equal(ogVendor.fields.company, "Stripe");
  assert.notEqual(ogVendor.fields.company, "Greenhouse");
}

// ---------------------------------------------------------------------------
// Workday tenant subdomain → company
// ---------------------------------------------------------------------------

const workdayHtml = `
<html>
  <body>
    <h1 data-automation-id="jobPostingHeader">Principal Product Designer</h1>
    <div data-automation-id="locations">
      <div data-automation-id="location">San Francisco, CA</div>
    </div>
  </body>
</html>
`;

const workdayResult = extractJobFieldsFromHtml(
  workdayHtml,
  "https://nvidia.wd5.myworkdayjobs.com/en-US/NVIDIAExternalCareerSite/job/US-CA-Santa-Clara/Principal-Product-Designer_JR123",
);
assert.equal(workdayResult.ok, true);
if (workdayResult.ok) {
  assert.equal(workdayResult.fields.role, "Principal Product Designer");
  assert.match(workdayResult.fields.company ?? "", /NVIDIA/i);
  assert.equal(workdayResult.fields.location, "San Francisco, CA");
}

// Workday: a generic "CORPORATE-CAREERS" path segment must NOT override the
// tenant subdomain as the company (regression — used to yield "Corporate").
const workdayCorpResult = extractJobFieldsFromHtml(
  `<html><body><h1 data-automation-id="jobPostingHeader">Product Manager</h1></body></html>`,
  "https://northwesternmutual.wd5.myworkdayjobs.com/en-US/CORPORATE-CAREERS/job/Product-Manager_JR-43483",
);
assert.equal(workdayCorpResult.ok, true);
if (workdayCorpResult.ok) {
  // Derived from the tenant subdomain ("northwesternmutual"), not the generic
  // "CORPORATE-CAREERS" path segment. slugToLabel can't re-insert the space in
  // a concatenated tenant, but "Northwesternmutual" beats the wrong "Corporate".
  assert.match(workdayCorpResult.fields.company ?? "", /Northwestern/i);
  assert.notEqual(workdayCorpResult.fields.company, "Corporate");
}

// ---------------------------------------------------------------------------
// BambooHR tenant subdomain → company
// ---------------------------------------------------------------------------

const bamboohrHtml = `
<html>
  <body>
    <h2 class="posting-title">Senior Backend Engineer</h2>
    <div class="posting-location">Remote</div>
  </body>
</html>
`;

const bamboohrResult = extractJobFieldsFromHtml(
  bamboohrHtml,
  "https://onezero.bamboohr.com/careers/279",
);
assert.equal(bamboohrResult.ok, true);
if (bamboohrResult.ok) {
  assert.equal(bamboohrResult.fields.role, "Senior Backend Engineer");
  assert.equal(bamboohrResult.fields.company, "Onezero");
  assert.equal(bamboohrResult.fields.location, "Remote");
}

// ---------------------------------------------------------------------------
// JSON-LD wins over generic OG title even when both contain a company
// ---------------------------------------------------------------------------

const jsonLdVsOg = `
<html>
  <head>
    <title>Engineer at Acme Inc</title>
    <meta property="og:title" content="Engineer at Acme" />
    <meta property="og:site_name" content="Acme" />
    <script type="application/ld+json">
      {
        "@type": "JobPosting",
        "title": "Engineer",
        "hiringOrganization": { "name": "Acme, Inc." },
        "baseSalary": {
          "currency": "USD",
          "unitText": "YEAR",
          "value": { "minValue": 130000, "maxValue": 170000 }
        }
      }
    </script>
  </head>
  <body><h1>Engineer</h1></body>
</html>
`;

const jsonLdWin = extractJobFieldsFromHtml(jsonLdVsOg, "https://example.com/jobs/1");
assert.equal(jsonLdWin.ok, true);
if (jsonLdWin.ok) {
  assert.equal(jsonLdWin.fields.company, "Acme, Inc.");
  assert.match(jsonLdWin.fields.salary ?? "", /\$130,000/);
  assert.match(jsonLdWin.fields.salary ?? "", /\$170,000/);
}

// ---------------------------------------------------------------------------
// Generic page title (e.g. "Careers") does NOT win the role field
// ---------------------------------------------------------------------------

const careersTitleHtml = `
<html>
  <head>
    <title>Careers</title>
    <meta property="og:title" content="Careers - Acme" />
  </head>
  <body>
    <h1>Backend Engineer</h1>
    <span class="company-name">Acme</span>
  </body>
</html>
`;

const careersResult = extractJobFieldsFromHtml(
  careersTitleHtml,
  "https://www.acme.com/careers/backend-engineer",
);
assert.equal(careersResult.ok, true);
if (careersResult.ok) {
  assert.equal(careersResult.fields.role, "Backend Engineer");
  assert.notEqual(careersResult.fields.role, "Careers");
}

// ---------------------------------------------------------------------------
// Salary noise rejection in body text (funding, stipends, equity grants)
// ---------------------------------------------------------------------------

const noisyBody = `
<html>
  <head>
    <title>Engineer at Acme</title>
    <meta property="og:title" content="Engineer at Acme" />
  </head>
  <body>
    <h1>Engineer</h1>
    <p>We raised our Series C at a valuation of $1.5B — equity grants up to $250,000 per founder.</p>
    <p>Base salary: $140,000 - $180,000 per year.</p>
  </body>
</html>
`;

const noisyResult = extractJobFieldsFromHtml(noisyBody, "https://example.com/jobs/2");
assert.equal(noisyResult.ok, true);
if (noisyResult.ok) {
  assert.match(noisyResult.fields.salary ?? "", /\$140,000/);
  assert.match(noisyResult.fields.salary ?? "", /\$180,000/);
  assert.doesNotMatch(noisyResult.fields.salary ?? "", /1\.5B/);
  assert.doesNotMatch(noisyResult.fields.salary ?? "", /\$250,000/);
}

// ---------------------------------------------------------------------------
// Captcha / blocked / expired detection via fetch error codes
// ---------------------------------------------------------------------------

import { JobParseError } from "@/lib/job-link/internal";

const captchaError = new JobParseError("captcha", "challenge");
assert.equal(captchaError.code, "captcha");
assert.equal(captchaError.name, "JobParseError");

// ---------------------------------------------------------------------------
// URL canonicalization for embedded ATS widgets
// ---------------------------------------------------------------------------

import { canonicalizeJobUrl } from "@/lib/job-link/canonicalize";

// Ashby widget embedded on company's own domain
assert.equal(
  canonicalizeJobUrl(
    "https://govwell.com/careers?ashby_jid=fcd29040-ef3b-454a-b4ef-25c4a8e27fa0&utm_source=LinkedInJobs",
  ),
  "https://jobs.ashbyhq.com/govwell/fcd29040-ef3b-454a-b4ef-25c4a8e27fa0",
);

assert.equal(
  canonicalizeJobUrl("https://www.acmecorp.com/careers/?ashby_jid=11111111-2222-3333-4444-555555555555"),
  "https://jobs.ashbyhq.com/acmecorp/11111111-2222-3333-4444-555555555555",
);

// Already on Ashby host — should not rewrite
assert.equal(
  canonicalizeJobUrl("https://jobs.ashbyhq.com/tetrix/abc-123"),
  "https://jobs.ashbyhq.com/tetrix/abc-123",
);

// Greenhouse embed
assert.equal(
  canonicalizeJobUrl("https://www.example.com/careers/?gh_jid=7954862"),
  "https://job-boards.greenhouse.io/example/jobs/7954862",
);

// Already on Greenhouse host — should not rewrite
assert.equal(
  canonicalizeJobUrl("https://boards.greenhouse.io/acme/jobs/12345"),
  "https://boards.greenhouse.io/acme/jobs/12345",
);

// No ATS query param — passes through unchanged
assert.equal(
  canonicalizeJobUrl("https://example.com/jobs/software-engineer"),
  "https://example.com/jobs/software-engineer",
);

// Malformed UUID — does not rewrite (avoid false positives)
assert.equal(
  canonicalizeJobUrl("https://example.com/?ashby_jid=not-a-uuid"),
  "https://example.com/?ashby_jid=not-a-uuid",
);

// `careers.` subdomain is stripped before deriving slug
assert.equal(
  canonicalizeJobUrl(
    "https://careers.foobar.co/?ashby_jid=aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  ),
  "https://jobs.ashbyhq.com/foobar/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
);

console.log("job-link parser tests passed");
