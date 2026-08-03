/**
 * Date parsing regression tests for the import pipeline.
 *
 * The bug these guard against: a date-only value parsed into midnight UTC
 * (`new Date("2026-08-03")` per spec, and the Excel-serial path) shifts back one
 * calendar day for every negative-offset timezone. The dashboard buckets by day
 * in the user's timezone, so an imported application dated "today" was counted
 * yesterday and "applied today" read 0.
 *
 * Run: npx tsx lib/excel.test.ts
 */
import { normalizeRow, type SchemaField } from "@/lib/excel";
import { isoDateKeyInTimezone } from "@/lib/utils";

let failures = 0;

function check(label: string, actual: string, expected: string) {
  if (actual === expected) {
    console.log(`  PASS  ${label} -> ${actual}`);
  } else {
    console.error(`  FAIL  ${label}: expected ${expected}, got ${actual}`);
    failures++;
  }
}

const mapping: Record<string, SchemaField> = {
  Company: "company",
  Role: "role",
  Date: "applicationDate",
};

function parseDate(value: unknown, prefer: "DDMM" | "MMDD" = "MMDD") {
  const row = normalizeRow({ Company: "Acme", Role: "SWE", Date: value }, mapping, prefer);
  return row.applicationDate;
}

/**
 * A date-only import must land on the intended calendar day in timezones on
 * both sides of UTC. These are the offsets that broke before the fix.
 */
const ZONES = ["America/Los_Angeles", "America/New_York", "UTC", "Asia/Kolkata", "Australia/Sydney"];

console.log("date-only values keep their calendar day across timezones");
for (const value of ["2026-08-03", "8/3/2026", "Aug 3 2026"]) {
  const d = parseDate(value);
  if (!d) {
    console.error(`  FAIL  ${String(value)} did not parse`);
    failures++;
    continue;
  }
  for (const tz of ZONES) {
    check(`${JSON.stringify(value)} in ${tz}`, isoDateKeyInTimezone(d, tz), "2026-08-03");
  }
}

console.log("\nExcel serials keep their calendar day");
// Serial 46237 is 2026-08-03 (days since the 1900 epoch, per SheetJS).
const serial = parseDate(46237);
if (!serial) {
  console.error("  FAIL  serial did not parse");
  failures++;
} else {
  for (const tz of ZONES) {
    check(`serial 46237 in ${tz}`, isoDateKeyInTimezone(serial, tz), "2026-08-03");
  }
}

console.log("\nDD/MM vs MM/DD preference is respected");
const ddmm = parseDate("3/8/2026", "DDMM");
const mmdd = parseDate("3/8/2026", "MMDD");
check("3/8/2026 as DDMM", ddmm ? isoDateKeyInTimezone(ddmm, "UTC") : "undefined", "2026-08-03");
check("3/8/2026 as MMDD", mmdd ? isoDateKeyInTimezone(mmdd, "UTC") : "undefined", "2026-03-08");

console.log("\nUnambiguous days override the preference");
const unambiguous = parseDate("21/5/2026", "MMDD");
check(
  "21/5/2026 with MMDD preference",
  unambiguous ? isoDateKeyInTimezone(unambiguous, "UTC") : "undefined",
  "2026-05-21",
);

console.log("\nA real timestamp is preserved, not re-anchored");
const withTime = parseDate("2026-08-03T15:30:00");
if (!withTime) {
  console.error("  FAIL  timestamp did not parse");
  failures++;
} else {
  check("2026-08-03T15:30:00 hour", String(withTime.getHours()), "15");
  check("2026-08-03T15:30:00 minute", String(withTime.getMinutes()), "30");
}

console.log("\nInvalid values are rejected");
check("empty string", String(parseDate("")), "undefined");
check("garbage", String(parseDate("not a date")), "undefined");
check("3-digit year typo", String(parseDate("3/8/126")), "undefined");

if (failures > 0) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log("\nAll date parsing tests passed.");
