"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { GlassCard } from "@/components/glass/glass-card";
import { CompanyLogo } from "@/components/applications/company-logo";
import { StatusPill } from "@/components/applications/status-pill";
import { ApplicationSheet } from "@/components/applications/application-sheet";
import { formatRelative } from "@/lib/utils";
import type { ApplicationRow } from "@/components/applications/data-table";
import {
  applicationInputToRowPatch,
  applicationRowToFormDefaults,
} from "@/lib/application-row-form";

export function RecentApplications({ rows }: { rows: ApplicationRow[] }) {
  const [localRows, setLocalRows] = useState(rows);
  const [editing, setEditing] = useState<ApplicationRow | null>(null);

  useEffect(() => {
    setLocalRows(rows);
  }, [rows]);

  return (
    <GlassCard className="p-4 sm:p-6">
      <header className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-medium tracking-tight text-muted-foreground">Recent</h2>
        <Link href="/applications" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          See all <ArrowRight className="size-3" />
        </Link>
      </header>
      {localRows.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          You haven&apos;t logged any applications yet. Start with one.
        </p>
      ) : (
        <ul className="space-y-1">
          {localRows.map((row, i) => (
            <motion.li
              key={row.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <button
                type="button"
                onClick={() => setEditing(row)}
                className="-mx-3 flex w-[calc(100%+1.5rem)] items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-background/40 md:items-center"
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
      {editing && (
        <ApplicationSheet
          open={!!editing}
          onOpenChange={(open) => !open && setEditing(null)}
          mode={{
            kind: "edit",
            id: editing.id,
            defaults: applicationRowToFormDefaults(editing),
          }}
          onSaved={(values) => {
            const patch = applicationInputToRowPatch(values);
            setLocalRows((prev) =>
              prev.map((row) => (row.id === editing.id ? { ...row, ...patch } : row)),
            );
            setEditing((prev) => (prev ? { ...prev, ...patch } : prev));
          }}
        />
      )}
    </GlassCard>
  );
}
