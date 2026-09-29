"use client";

import { EASE_OUT } from "@/lib/motion";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { GlassCard } from "@/components/glass/glass-card";
import { CompanyLogo } from "@/components/applications/company-logo";
import { StatusPill } from "@/components/applications/status-pill";
import { ApplicationSheet } from "@/components/applications/application-sheet";
import { useRetained } from "@/lib/hooks/use-retained";
import {
  isPendingRow,
  mergePendingRows,
  rowKey,
  usePendingApplications,
} from "@/components/applications/optimistic-applications";
import { formatRelative } from "@/lib/utils";
import type { ApplicationRow } from "@/components/applications/data-table";
import {
  applicationInputToRowPatch,
  applicationRowToFormDefaults,
} from "@/lib/application-row-form";

export function RecentApplications({ rows }: { rows: ApplicationRow[] }) {
  // Edits are patched over the server rows rather than copied into state: a
  // copy trails the props by a render, so a new row would vanish for a frame
  // when it hands over from pending to confirmed, then remount.
  const [patches, setPatches] = useState<Record<string, Partial<ApplicationRow>>>({});
  const [editing, setEditing] = useState<ApplicationRow | null>(null);
  // Retained so the sheet can finish its slide-out instead of being unmounted
  // the moment `editing` clears. See useRetained.
  const sheetRow = useRetained(editing);

  useEffect(() => {
    setPatches({});
  }, [rows]);
  const localRows = rows.map((row) => (patches[row.id] ? { ...row, ...patches[row.id] } : row));
  const pending = usePendingApplications();
  const displayRows = mergePendingRows(pending, localRows, Math.max(localRows.length, 6));

  return (
    <GlassCard className="p-4 sm:p-6">
      <header className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-medium tracking-tight text-muted-foreground">Recent</h2>
        <Link href="/applications" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          See all <ArrowRight className="size-3" />
        </Link>
      </header>
      {displayRows.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          You haven&apos;t logged any applications yet. Start with one.
        </p>
      ) : (
        <ul className="space-y-1">
          {displayRows.map((row, i) => (
            <motion.li
              key={rowKey(row)}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.3, ease: EASE_OUT }}
            >
              <button
                type="button"
                onClick={() => setEditing(row)}
                // A row still being saved has no id to edit yet.
                disabled={isPendingRow(row)}
                className="-mx-3 flex w-[calc(100%+1.5rem)] touch-manipulation items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors disabled:pointer-events-none hover:bg-background/40 active:bg-background/70 md:items-center"
              >
                <CompanyLogo
                  company={row.company}
                  jobLink={row.jobLink}
                  companyDomain={row.companyDomain}
                  size="sm"
                  className="mt-0.5 md:mt-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-0.5 md:flex-row md:items-center md:gap-2">
                    <span className="font-medium leading-snug tracking-tight">{row.company}</span>
                    <span className="line-clamp-2 text-sm leading-snug text-muted-foreground md:line-clamp-1 md:truncate">
                      <span className="hidden md:inline">· </span>
                      {row.role}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground md:mt-0">
                    {formatRelative(row.applicationDate)}
                  </p>
                </div>
                <StatusPill status={row.status} className="shrink-0 self-start md:self-center" />
              </button>
            </motion.li>
          ))}
        </ul>
      )}
      {sheetRow && (
        <ApplicationSheet
          open={!!editing}
          onOpenChange={(open) => !open && setEditing(null)}
          mode={{
            kind: "edit",
            id: sheetRow.id,
            defaults: applicationRowToFormDefaults(sheetRow),
          }}
          onSaved={(values) => {
            const patch = applicationInputToRowPatch(values);
            setPatches((prev) => ({ ...prev, [sheetRow.id]: { ...prev[sheetRow.id], ...patch } }));
          }}
        />
      )}
    </GlassCard>
  );
}
