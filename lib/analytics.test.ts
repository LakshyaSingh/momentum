import assert from "node:assert/strict";
import type { Application, StatusEvent } from "@prisma/client";
import {
  buildFunnel,
  buildProductivity,
  statusBreakdown,
  topCompanies,
} from "@/lib/analytics";

/**
 * Covers the pure aggregation that backs the MCP `get_search_summary` tool
 * (via `getSearchSummaryForUser` in lib/applications/service.ts). DB-bound
 * service functions are exercised end-to-end with the MCP Inspector instead.
 */

type AppWithEvents = Application & { events: StatusEvent[] };

let idCounter = 0;
function app(
  status: Application["status"],
  opts: {
    company?: string;
    date?: string;
    responseReceived?: boolean;
    events?: Application["status"][];
  } = {},
): AppWithEvents {
  const id = `app-${idCounter++}`;
  const applicationDate = new Date(opts.date ?? "2026-07-01");
  const eventStatuses = opts.events ?? [status];
  return {
    id,
    userId: "u1",
    company: opts.company ?? "Acme",
    companyDomain: null,
    role: "Engineer",
    location: null,
    jobLink: null,
    applicationDate,
    status,
    salary: null,
    recruiter: null,
    referral: null,
    notes: null,
    followUpDate: null,
    responseReceived: opts.responseReceived ?? false,
    interviewStage: null,
    offerStatus: null,
    createdAt: applicationDate,
    updatedAt: applicationDate,
    events: eventStatuses.map((s, i) => ({
      id: `${id}-e${i}`,
      applicationId: id,
      status: s,
      occurredAt: applicationDate,
      note: null,
    })),
  };
}

// --- statusBreakdown -------------------------------------------------------
const breakdown = statusBreakdown([
  app("APPLIED"),
  app("APPLIED"),
  app("REJECTED"),
  app("OFFER"),
]);
assert.equal(breakdown.APPLIED, 2);
assert.equal(breakdown.REJECTED, 1);
assert.equal(breakdown.OFFER, 1);
assert.equal(breakdown.GHOSTED, 0, "unused statuses are zero-filled");
assert.equal(
  Object.values(breakdown).reduce((a, b) => a + b, 0),
  4,
  "counts sum to the number of applications",
);

// --- buildFunnel -----------------------------------------------------------
const funnel = buildFunnel([
  app("APPLIED"),
  app("REJECTED", { events: ["APPLIED", "REJECTED"] }),
  app("INTERVIEW", { events: ["APPLIED", "INTERVIEW"] }),
  app("OFFER", { events: ["APPLIED", "INTERVIEW", "FINAL_ROUND", "OFFER"] }),
]);
const stage = (key: string) => funnel.find((s) => s.key === key)?.count;
assert.equal(stage("applied"), 4, "everyone is counted as applied");
assert.equal(stage("response"), 3, "rejected + interview + offer are responses");
assert.equal(stage("interview"), 2, "interview + offer reached interview");
assert.equal(stage("final"), 1, "only the offer reached a final round");
assert.equal(stage("offer"), 1);

// --- buildProductivity -----------------------------------------------------
const productivity = buildProductivity(
  [
    app("APPLIED", { date: "2026-07-01" }),
    app("APPLIED", { date: "2026-07-01" }),
    app("REJECTED", { date: "2026-07-02", events: ["APPLIED", "REJECTED"] }),
    app("INTERVIEW", { date: "2026-07-03", events: ["APPLIED", "INTERVIEW"] }),
  ],
  5,
);
assert.equal(productivity.total, 4);
assert.equal(productivity.longestStreak, 5, "longest streak is passed through");
assert.equal(productivity.bestDay?.count, 2, "best day has two applications");
assert.equal(productivity.responseRate, 0.5, "2 of 4 got a response");
assert.equal(productivity.interviewRate, 0.25, "1 of 4 reached interview");

// empty input must not throw
const empty = buildProductivity([], 0);
assert.equal(empty.total, 0);
assert.equal(empty.responseRate, 0);
assert.equal(empty.bestDay, null);

// --- topCompanies ----------------------------------------------------------
const companies = topCompanies([
  app("APPLIED", { company: "Acme" }),
  app("INTERVIEW", { company: "Acme" }),
  app("APPLIED", { company: "Globex" }),
]);
assert.equal(companies[0]?.company, "Acme", "most-applied company sorts first");
assert.equal(companies[0]?.total, 2);
assert.equal(companies[0]?.positive, 1, "interview counts as positive");

console.log("analytics summary tests passed");
