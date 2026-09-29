"use client";

import { createContext, useContext, useMemo, useOptimistic, type ReactNode } from "react";
import type { ApplicationRow } from "@/components/applications/data-table";
import { applicationInputToRowPatch } from "@/lib/application-row-form";
import { responseReceivedForStatus } from "@/lib/response-received";
import { isoDateKeyInTimezone } from "@/lib/utils";
import type { ApplicationInput } from "@/lib/validators";

/**
 * Applications the user has submitted but the server has not confirmed yet.
 *
 * A create used to show up only after two round trips: the server action, then
 * a `router.refresh()` of the whole page. The motivation banner fired between
 * them, so the new row and the goal ring visibly lagged behind it.
 *
 * `useOptimistic` fixes this without any reconciliation code. A pending row is
 * added inside the create's transition and React drops it when that transition
 * settles — which is the same commit that applies the server action's
 * revalidated page. The optimistic row and the real one swap in one frame, so
 * nothing is ever double-counted and nothing flickers. If the create fails, the
 * row simply disappears.
 */

const PENDING_PREFIX = "pending:";
const NONE: ApplicationRow[] = [];

type PendingApplications = {
  rows: ApplicationRow[];
  add: (row: ApplicationRow) => void;
  timeZone: string;
};

const PendingApplicationsContext = createContext<PendingApplications>({
  rows: NONE,
  add: () => {},
  timeZone: "UTC",
});

export function PendingApplicationsProvider({
  timeZone,
  children,
}: {
  timeZone: string;
  children: ReactNode;
}) {
  const [rows, add] = useOptimistic(NONE, (current: ApplicationRow[], row: ApplicationRow) => [
    row,
    ...current,
  ]);
  const value = useMemo(() => ({ rows, add, timeZone: timeZone || "UTC" }), [rows, add, timeZone]);
  return (
    <PendingApplicationsContext.Provider value={value}>{children}</PendingApplicationsContext.Provider>
  );
}

/** Must be called inside a transition — `useOptimistic` requires it. */
export function useAddPendingApplication() {
  return useContext(PendingApplicationsContext).add;
}

export function usePendingApplications() {
  return useContext(PendingApplicationsContext).rows;
}

/** Pending creates dated today, or within the last 7 days, in the user's timezone. */
export function usePendingCount(scope: "today" | "week" | "all") {
  const { rows, timeZone } = useContext(PendingApplicationsContext);
  if (rows.length === 0 || scope === "all") return rows.length;

  const now = Date.now();
  const todayKey = isoDateKeyInTimezone(new Date(now), timeZone);
  const weekStartKey = isoDateKeyInTimezone(new Date(now - 6 * 86_400_000), timeZone);
  return rows.filter((row) => {
    const key = isoDateKeyInTimezone(new Date(row.applicationDate), timeZone);
    return scope === "today" ? key === todayKey : key >= weekStartKey && key <= todayKey;
  }).length;
}

export function newPendingRow(values: ApplicationInput): ApplicationRow {
  return {
    id: `${PENDING_PREFIX}${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
    company: values.company,
    role: values.role,
    status: values.status,
    companyDomain: null,
    location: null,
    jobLink: null,
    salary: null,
    recruiter: null,
    referral: null,
    notes: null,
    followUpDate: null,
    interviewStage: null,
    offerStatus: null,
    ...applicationInputToRowPatch(values),
    applicationDate: (values.applicationDate ?? new Date()).toISOString(),
    responseReceived: responseReceivedForStatus(values.status),
  };
}

export function isPendingRow(row: Pick<ApplicationRow, "id">) {
  return row.id.startsWith(PENDING_PREFIX);
}

/*
 * The confirmed row arrives with its database id, which would remount it under
 * a new React key and replay its entrance animation right after the pending
 * row's. Remembering which pending key it replaced keeps it the same element.
 */
const settledKeys = new Map<string, string>();

export function rememberSettledRow(id: string, pendingId: string) {
  settledKeys.set(id, pendingId);
}

export function rowKey(row: Pick<ApplicationRow, "id">) {
  return settledKeys.get(row.id) ?? row.id;
}

/** Newest first, the order the dashboard and the default list use. */
export function mergePendingRows(pending: ApplicationRow[], rows: ApplicationRow[], limit?: number) {
  if (pending.length === 0) return rows;
  const merged = [...pending, ...rows].sort(
    (a, b) => Date.parse(b.applicationDate) - Date.parse(a.applicationDate),
  );
  return limit === undefined ? merged : merged.slice(0, limit);
}
