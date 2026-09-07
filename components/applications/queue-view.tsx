"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ExternalLink,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { DURATION_AMBIENT, EASE_OUT } from "@/lib/motion";
import { GlassCard } from "@/components/glass/glass-card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CompanyLogo } from "@/components/applications/company-logo";
import { QueueCapture } from "@/components/applications/queue-capture";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  QueuedJobForm,
  type QueuedJobFormIntent,
  type QueuedJobFormValues,
} from "@/components/applications/queued-job-form";
import {
  applyQueuedJob,
  deleteQueuedJob,
  updateQueuedJob,
} from "@/app/actions/queued-jobs";
import {
  canApplyDirectly,
  daysWaiting,
  queuedJobLabel,
  waitingLabel,
  type QueuedJobRow,
} from "@/lib/queued-jobs";
import { asMessage } from "@/lib/job-link-client";
import { useMotivationStore } from "@/stores/motivation-store";
import {
  clearApplicationsIndexWarmCache,
  warmApplicationsNavigation,
} from "@/lib/applications-index-client";
import type { ParsedJobFields } from "@/lib/job-link/types";
import { cn } from "@/lib/utils";

type QueueViewProps = {
  serverRows: QueuedJobRow[];
  /** Keeps the tab badge and header count in sync without a server round-trip. */
  onCountChange?: (count: number) => void;
};

export function QueueView({ serverRows, onCountChange }: QueueViewProps) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [rows, setRows] = useState<QueuedJobRow[]>(serverRows);
  const [enriching, setEnriching] = useState<Set<string>>(() => new Set());
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [detailsFor, setDetailsFor] = useState<QueuedJobRow | null>(null);
  const trigger = useMotivationStore((s) => s.trigger);

  // Rows created locally during this session are already in state; re-sync when
  // the server sends a new set (navigation, refresh, applying a job).
  const serverRowsRef = useRef(serverRows);
  useEffect(() => {
    if (serverRowsRef.current !== serverRows) {
      serverRowsRef.current = serverRows;
      setRows(serverRows);
    }
  }, [serverRows]);

  useEffect(() => {
    onCountChange?.(rows.length);
  }, [rows.length, onCountChange]);

  const markEnriching = useCallback((id: string, on: boolean) => {
    setEnriching((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  /**
   * Run the full page parse and fold the result back into the row.
   *
   * Split out from creation on purpose: `/api/jobs/parse` fetches the posting
   * and can take upwards of ten seconds, which would destroy the capture loop
   * if it ran inline.
   */
  const enrich = useCallback(
    async (row: QueuedJobRow, { quiet = true }: { quiet?: boolean } = {}) => {
      markEnriching(row.id, true);
      try {
        const response = await fetch("/api/jobs/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: row.jobLink }),
        });
        const data = (await response.json().catch(() => ({}))) as {
          fields?: ParsedJobFields;
          error?: unknown;
        };

        if (!response.ok || !data.fields) {
          if (!quiet) {
            toast.error(asMessage(data.error, "Couldn't read that job posting."));
          }
          return;
        }

        const res = await updateQueuedJob({
          id: row.id,
          company: data.fields.company,
          role: data.fields.role,
          location: data.fields.location,
          salary: data.fields.salary,
        });
        if (!res.ok) {
          if (!quiet) toast.error(asMessage(res.error, "Couldn't update that row."));
          return;
        }

        setRows((prev) => prev.map((r) => (r.id === res.job.id ? res.job : r)));
        if (!quiet) toast.success("Details updated");
      } catch (err) {
        console.error("Queue enrichment failed", err);
        if (!quiet) toast.error("Couldn't read that job posting.");
      } finally {
        markEnriching(row.id, false);
      }
    },
    [markEnriching],
  );

  function handleCreated(row: QueuedJobRow) {
    setRows((prev) => [row, ...prev]);
    void enrich(row);
  }

  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleApply(row: QueuedJobRow) {
    setApplyingId(row.id);
    try {
      const res = await applyQueuedJob({ id: row.id });
      if (!res.ok) {
        toast.error(asMessage(res.error, "Couldn't apply that job."));
        return;
      }
      removeRow(row.id);
      toast.success(`Marked ${queuedJobLabel(row)} as applied`);
      clearApplicationsIndexWarmCache();
      try {
        trigger({
          quoteSeed: res.motivation.quoteId,
          milestone: res.milestone,
          streak: res.currentStreak,
        });
      } catch (err) {
        console.error("Motivation overlay failed", err);
      }
      router.refresh();
      warmApplicationsNavigation(router, { forceIndex: true });
    } finally {
      setApplyingId(null);
    }
  }

  async function handleDelete(row: QueuedJobRow) {
    removeRow(row.id);
    const res = await deleteQueuedJob(row.id);
    if (!res.ok) {
      toast.error(asMessage(res.error, "Couldn't remove that row."));
      setRows((prev) => [row, ...prev]);
      return;
    }
    router.refresh();
  }

  /**
   * Save the details the user just filled in.
   *
   * "Save" keeps the row queued — the whole point of this form is that filling
   * in a company and role is not the same as having applied. "Save & mark as
   * applied" then runs the ordinary promotion, so both outcomes go through the
   * exact same code path as the row button rather than a parallel one.
   */
  async function handleDetailsSubmit(
    row: QueuedJobRow,
    values: QueuedJobFormValues,
    intent: QueuedJobFormIntent,
  ) {
    const res = await updateQueuedJob({ id: row.id, ...values });
    if (!res.ok) {
      toast.error(asMessage(res.error, "Couldn't save those details."));
      return;
    }

    setRows((prev) => prev.map((r) => (r.id === res.job.id ? res.job : r)));
    setDetailsFor(null);

    if (intent === "save") {
      toast.success("Details saved");
      router.refresh();
      return;
    }

    await handleApply(res.job);
  }

  return (
    <div className="space-y-4">
      <QueueCapture onCreated={handleCreated} />

      {rows.length === 0 ? (
        <GlassCard className="p-10 text-center">
          <p className="text-sm font-medium">Nothing to apply to yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Paste a job link above while you&rsquo;re browsing. Apply to them all in
            one sitting later.
          </p>
        </GlassCard>
      ) : (
        <GlassCard className="overflow-hidden p-0">
          <ul className="divide-y divide-border/60">
            <AnimatePresence initial={false}>
            {rows.map((row) => {
              const isEnriching = enriching.has(row.id);
              const isApplying = applyingId === row.id;
              const ready = canApplyDirectly(row);
              const days = daysWaiting(row.createdAt);

              return (
                <motion.li
                  key={row.id}
                  layout={!reduceMotion}
                  /*
                   * Applying a queued job removes it from this list. Without an
                   * exit the row vanishes mid-click and everything below snaps
                   * upward, which reads as a glitch rather than as the job
                   * moving on. It leaves to the right, toward Applied, and the
                   * survivors close the gap instead of teleporting.
                   */
                  exit={
                    reduceMotion
                      ? { opacity: 0 }
                      : { opacity: 0, transform: "translateX(28px)" }
                  }
                  transition={{ duration: DURATION_AMBIENT, ease: EASE_OUT }}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 transition-opacity",
                    isApplying && "opacity-60",
                  )}
                >
                  <CompanyLogo
                    company={row.company ?? ""}
                    jobLink={row.jobLink}
                    companyDomain={row.companyDomain}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium">
                        {queuedJobLabel(row)}
                      </span>
                      <a
                        href={row.jobLink}
                        target="_blank"
                        rel="noreferrer noopener"
                        onClick={(event) => event.stopPropagation()}
                        className="shrink-0 text-muted-foreground/60 transition-colors hover:text-foreground"
                        aria-label="Open job posting"
                      >
                        <ExternalLink className="size-3.5" />
                      </a>
                      {isEnriching && (
                        <Loader2 className="size-3 shrink-0 animate-spin text-muted-foreground/60" />
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {row.role?.trim() ||
                        (isEnriching ? "Reading posting…" : "No role yet")}
                      {row.location ? ` · ${row.location}` : ""}
                    </p>
                  </div>

                  <span
                    className={cn(
                      "hidden shrink-0 text-xs sm:block",
                      days >= 5 ? "text-foreground/70" : "text-muted-foreground",
                    )}
                  >
                    {waitingLabel(days)}
                  </span>

                  {ready ? (
                    <Button
                      size="sm"
                      className="shrink-0 whitespace-nowrap"
                      disabled={isApplying}
                      onClick={() => void handleApply(row)}
                    >
                      {isApplying ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        "Mark as applied"
                      )}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDetailsFor(row)}
                    >
                      Add details
                    </Button>
                  )}

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label="Row actions">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[12rem]" liquidGlass>
                      <DropdownMenuItem onClick={() => setDetailsFor(row)}>
                        Mark applied, with details…
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => void enrich(row, { quiet: false })}
                        disabled={isEnriching}
                      >
                        <RefreshCw className="mr-2 size-3.5" />
                        Re-read link
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => void handleDelete(row)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 size-3.5" />
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </motion.li>
              );
            })}
            </AnimatePresence>
          </ul>
        </GlassCard>
      )}

      <Sheet
        open={detailsFor !== null}
        onOpenChange={(open) => {
          if (!open) setDetailsFor(null);
        }}
      >
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Add details</SheetTitle>
            <SheetDescription>
              We couldn&rsquo;t read this posting. Fill in what&rsquo;s missing and keep
              it queued, or mark it applied now.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            {detailsFor && (
              <QueuedJobForm
                row={detailsFor}
                onCancel={() => setDetailsFor(null)}
                onSubmit={(values, intent) =>
                  handleDetailsSubmit(detailsFor, values, intent)
                }
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

    </div>
  );
}
