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

console.log("company-lookup tests passed");
