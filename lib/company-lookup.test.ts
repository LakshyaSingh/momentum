import assert from "node:assert/strict";
import {
  normalizeCompanyNameForMatch,
  pickBestClearbitSuggestion,
  scoreClearbitSuggestion,
} from "@/lib/company-lookup";

assert.equal(normalizeCompanyNameForMatch("JPMorgan Chase & Co."), "jpmorgan chase");
assert.equal(scoreClearbitSuggestion("HqO", { name: "HqO", domain: "hqo.com", logo: null }), 100);
assert.equal(
  scoreClearbitSuggestion("HqO", { name: "حقول HQOL", domain: "hqolsa.com", logo: null }),
  0,
);

const hqoPick = pickBestClearbitSuggestion("HqO", [
  { name: "حقول HQOL", domain: "hqolsa.com", logo: null },
  { name: "HqO", domain: "hqo.com", logo: null },
]);
assert.equal(hqoPick?.domain, "hqo.com");

const jpmPick = pickBestClearbitSuggestion("JPMorgan Chase", [
  { name: "J.P. Morgan & Co.", domain: "jpmorgan.com", logo: null },
  { name: "JPMorgan Chase & Co.", domain: "jpmorganchase.com", logo: null },
]);
assert.equal(jpmPick?.domain, "jpmorganchase.com");

const twoSigmaPick = pickBestClearbitSuggestion("Two Sigma", [
  { name: "Two Sigma", domain: "twosigma.com", logo: null },
  { name: "Two Sigma Ventures", domain: "twosigmaventures.com", logo: null },
]);
assert.equal(twoSigmaPick?.domain, "twosigma.com");

assert.equal(
  scoreClearbitSuggestion("Reli.", { name: "Reliant Energy", domain: "reliant.com", logo: null }),
  0,
);
assert.equal(
  scoreClearbitSuggestion("Reli.", { name: "Relias", domain: "relias.com", logo: null }),
  0,
);

const reliPick = pickBestClearbitSuggestion("Reli.", [
  { name: "Reliant Energy", domain: "reliant.com", logo: null },
  { name: "Relias", domain: "relias.com", logo: null },
]);
assert.equal(reliPick, undefined);

// Containment: the suggestion is the broader/parent entity. This is the case
// that used to score 75 against an 85 threshold and silently fall back to
// initials, which is why domains had to be typed by hand.
assert.equal(
  scoreClearbitSuggestion("Highmark Health", {
    name: "Highmark",
    domain: "highmarkhealth.org",
    logo: null,
  }),
  90,
);

const highmarkPick = pickBestClearbitSuggestion("Highmark Health", [
  { name: "Highmark", domain: "highmarkhealth.org", logo: null },
  { name: "Highmark Health Options", domain: "highmarkhealthoptions.com", logo: null },
]);
assert.equal(highmarkPick?.domain, "highmarkhealth.org");

// Containment the other way: the suggestion is *more specific* than the query,
// which is often a different company sharing a word. It must score below the
// accept threshold so it can never win on its own.
assert.equal(
  scoreClearbitSuggestion("Cartesia", {
    name: "Cartesia Education",
    domain: "cartesia-education.fr",
    logo: null,
  }),
  80,
);
assert.equal(
  pickBestClearbitSuggestion("Cartesia", [
    { name: "Cartesia Education", domain: "cartesia-education.fr", logo: null },
  ]),
  undefined,
);

// ...but an exact match still outranks it when both are present.
const cartesiaPick = pickBestClearbitSuggestion("Cartesia", [
  { name: "Cartesia Education", domain: "cartesia-education.fr", logo: null },
  { name: "CARTESIAN", domain: "cartesiancompany.com", logo: null },
  { name: "Cartesia", domain: "cartesia.ai", logo: null },
]);
assert.equal(cartesiaPick?.domain, "cartesia.ai");

// A short query still demands an exact match: too little signal to trust
// containment when the name normalises to five characters or fewer. ("Ramp"
// against "Ramp Financial Services" scores 80 on containment, which clears the
// usual 85 bar for longer names but not the 100 required here.)
assert.equal(
  pickBestClearbitSuggestion("Ramp", [
    { name: "Ramp Financial Services", domain: "rampfinancialservices.com", logo: null },
  ]),
  undefined,
);

// Suffix stripping means "Reli Group" normalises to exactly "reli", so it is a
// genuine exact match rather than a containment guess, and is accepted even at
// the stricter short-query threshold.
assert.equal(
  pickBestClearbitSuggestion("Reli.", [
    { name: "Reli Group", domain: "religroup.com", logo: null },
  ])?.domain,
  "religroup.com",
);

console.log("company-lookup tests passed");
