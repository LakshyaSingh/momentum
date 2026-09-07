"use client";

import { useCallback, useState, type ReactNode } from "react";
import { ApplicationsView } from "@/components/applications/applications-view";
import { ApplicationsTabs } from "@/components/applications/applications-tabs";
import { QueueView } from "@/components/applications/queue-view";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import {
  applicationsQueryToSearchParams,
  type ApplicationsQuery,
  type ApplicationsTab,
} from "@/lib/applications-list";
import type { ApplicationRow } from "@/components/applications/data-table";
import type { QueuedJobRow } from "@/lib/queued-jobs";
import { cn } from "@/lib/utils";

type ApplicationsTabsViewProps = {
  rows: ApplicationRow[];
  queuedRows: QueuedJobRow[];
  filteredTotal: number;
  totalAll: number;
  query: ApplicationsQuery;
  quickAdd: ReactNode;
};

/**
 * Owns the Applied/Queue split in the browser.
 *
 * Both lists are fetched by the server on first load and both stay mounted, so
 * switching is a CSS toggle rather than a navigation. Routing on tab change
 * cost roughly 700ms of server work per click — a Supabase `getUser()`
 * roundtrip plus the row counts, which the pooled connection (`connection_limit=1`)
 * runs one after another rather than in parallel.
 */
export function ApplicationsTabsView({
  rows,
  queuedRows,
  filteredTotal,
  totalAll,
  query,
  quickAdd,
}: ApplicationsTabsViewProps) {
  const [tab, setTab] = useState<ApplicationsTab>(query.tab);
  const [queuedCount, setQueuedCount] = useState(queuedRows.length);

  const handleChange = useCallback(
    (next: ApplicationsTab) => {
      setTab((current) => {
        if (current === next) return current;

        // Keep the URL shareable and refresh-safe without paying for an RSC
        // fetch: replaceState updates the address bar only. Pagination resets
        // because page 3 of the applications table means nothing in the queue.
        const params = applicationsQueryToSearchParams(
          { ...query, tab: next },
          { tab: next, page: 1 },
        );
        const qs = params.toString();
        window.history.replaceState(
          null,
          "",
          qs ? `/applications?${qs}` : "/applications",
        );

        return next;
      });
    },
    [query],
  );

  const subtitle =
    tab === "queue"
      ? queuedCount === 0
        ? "Collect links now, apply to them in one sitting."
        : `${queuedCount} waiting to be applied to.`
      : totalAll === 0
        ? "Log your first application. Momentum starts now."
        : `${totalAll} ${totalAll === 1 ? "application" : "applications"}, all in one place.`;

  return (
    <>
      <ScrollReveal as="header" className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-display-md font-semibold tracking-tight">Applications</h1>
          <p className="mt-1 text-muted-foreground">{subtitle}</p>
        </div>
        {quickAdd}
      </ScrollReveal>

      <ScrollReveal delay={0.05} className="space-y-4">
        <ApplicationsTabs value={tab} onChange={handleChange} queuedCount={queuedCount} />

        <div className={cn(tab !== "applications" && "hidden")}>
          <ApplicationsView
            serverRows={rows}
            filteredTotal={filteredTotal}
            totalAll={totalAll}
            query={query}
          />
        </div>

        <div className={cn(tab !== "queue" && "hidden")}>
          <QueueView serverRows={queuedRows} onCountChange={setQueuedCount} />
        </div>
      </ScrollReveal>
    </>
  );
}
