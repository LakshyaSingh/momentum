"use client";

import { useEffect, useMemo, useState, Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, CheckCircle2, Pencil, X } from "lucide-react";
import { GlassCard } from "@/components/glass/glass-card";
import { StatusPill } from "@/components/applications/status-pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { NormalizedRow } from "@/lib/excel";
import { formatDate } from "@/lib/utils";

type PreviewFilter = "all" | "valid" | "issues";

interface ImportPreviewProps {
  rows: NormalizedRow[];
  onUpdateRow: (sourceIndex: number, patch: Partial<NormalizedRow>) => void;
}

function toDateInputValue(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function rowLabel(row: NormalizedRow) {
  const parts: string[] = [];
  if (row._excelRow) parts.push(`Row ${row._excelRow}`);
  else parts.push(`#${row._sourceIndex + 1}`);
  if (row._sheet) parts.push(row._sheet);
  return parts.join(" · ");
}

function ImportRowFixPanel({
  row,
  onUpdate,
  onClose,
}: {
  row: NormalizedRow;
  onUpdate: (patch: Partial<NormalizedRow>) => void;
  onClose: () => void;
}) {
  return (
    <div className="space-y-4 border-t border-amber-500/20 bg-amber-500/[0.04] px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Fix this row</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {rowLabel(row)} — fill in the missing fields to include it in your import.
          </p>
        </div>
        <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor={`fix-company-${row._sourceIndex}`}>Company</Label>
          <Input
            id={`fix-company-${row._sourceIndex}`}
            value={row.company}
            placeholder="Apple"
            onChange={(e) => onUpdate({ company: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`fix-role-${row._sourceIndex}`}>Role</Label>
          <Input
            id={`fix-role-${row._sourceIndex}`}
            value={row.role}
            placeholder="Software Engineer"
            onChange={(e) => onUpdate({ role: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`fix-date-${row._sourceIndex}`}>Application date</Label>
          <Input
            id={`fix-date-${row._sourceIndex}`}
            type="date"
            value={row.applicationDate ? toDateInputValue(row.applicationDate) : ""}
            onChange={(e) =>
              onUpdate({
                applicationDate: e.target.value ? new Date(`${e.target.value}T12:00:00`) : undefined,
              })
            }
          />
        </div>
      </div>
      {row._errors.length === 0 ? (
        <p className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-3.5" /> Ready to import
        </p>
      ) : (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Still missing: {row._errors.join(", ")}
        </p>
      )}
    </div>
  );
}

export function ImportPreview({ rows, onUpdateRow }: ImportPreviewProps) {
  const ok = rows.filter((r) => r._errors.length === 0).length;
  const bad = rows.length - ok;

  const [filter, setFilter] = useState<PreviewFilter>(bad > 0 ? "issues" : "all");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  useEffect(() => {
    if (bad > 0) {
      setFilter("issues");
      setEditingIndex((prev) => {
        if (prev !== null && rows.some((r) => r._sourceIndex === prev && r._errors.length > 0)) {
          return prev;
        }
        const firstIssue = rows.find((r) => r._errors.length > 0);
        return firstIssue?._sourceIndex ?? null;
      });
    } else {
      setEditingIndex(null);
    }
  }, [bad, rows]);

  const visible = useMemo(() => {
    if (filter === "issues") return rows.filter((r) => r._errors.length > 0);
    if (filter === "valid") return rows.filter((r) => r._errors.length === 0).slice(0, 50);
    return rows.slice(0, 25);
  }, [rows, filter]);

  const hiddenCount =
    filter === "all" && rows.length > 25
      ? rows.length - 25
      : filter === "valid" && ok > 50
        ? ok - 50
        : 0;

  return (
    <GlassCard className="overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 px-6 py-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Preview
          </p>
          <p className="mt-1 text-base font-medium tracking-tight">
            {rows.length} row{rows.length === 1 ? "" : "s"} found
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1.5 text-emerald-500">
            <CheckCircle2 className="size-3.5" /> {ok} valid
          </span>
          {bad > 0 && (
            <span className="inline-flex items-center gap-1.5 text-amber-500">
              <AlertCircle className="size-3.5" /> {bad} need attention
            </span>
          )}
        </div>
      </div>

      {bad > 0 && (
        <div className="border-b border-amber-500/20 bg-amber-500/[0.06] px-6 py-3 text-sm text-amber-800 dark:text-amber-200">
          {bad} row{bad === 1 ? "" : "s"} couldn&apos;t be parsed automatically. Review them below,
          fix any missing company, role, or date, then import.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-b border-border/50 px-6 py-3">
        {(
          [
            { id: "all" as const, label: "All rows" },
            { id: "valid" as const, label: "Valid only" },
            { id: "issues" as const, label: `Needs attention${bad > 0 ? ` (${bad})` : ""}` },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            aria-pressed={filter === tab.id}
            className={
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors " +
              (filter === tab.id
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground")
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3 text-left font-medium">Source</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Company</th>
              <th className="px-4 py-3 text-left font-medium">Role</th>
              <th className="px-4 py-3 text-left font-medium">Applied</th>
              <th className="px-4 py-3 text-left font-medium">Stage</th>
              <th className="px-4 py-3 text-left font-medium">Issues</th>
              <th className="px-4 py-3 text-right font-medium" />
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-sm text-muted-foreground">
                  {filter === "issues" ? "No rows need attention." : "No rows to show."}
                </td>
              </tr>
            ) : (
              visible.map((row, i) => (
                <Fragment key={row._sourceIndex}>
                  <motion.tr
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i, 8) * 0.02, duration: 0.2 }}
                    className={
                      row._errors.length > 0
                        ? "border-b border-amber-500/15 bg-amber-500/[0.03]"
                        : "border-b border-border/30"
                    }
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted-foreground">
                      {rowLabel(row)}
                    </td>
                    <td className="px-4 py-3">
                      {row._errors.length === 0 ? (
                        <CheckCircle2 className="size-4 text-emerald-500" />
                      ) : (
                        <AlertCircle className="size-4 text-amber-500" />
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {row.company || <span className="text-muted-foreground/60">—</span>}
                    </td>
                    <td className="px-4 py-3 text-foreground/80">
                      {row.role || <span className="text-muted-foreground/60">—</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {row.applicationDate ? (
                        formatDate(row.applicationDate)
                      ) : (
                        <span className="text-muted-foreground/60">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={row.status} />
                    </td>
                    <td className="max-w-[12rem] px-4 py-3 text-xs text-amber-600 dark:text-amber-400">
                      {row._errors.length > 0 ? row._errors.join(" · ") : ""}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {row._errors.length > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8"
                          onClick={() =>
                            setEditingIndex((prev) =>
                              prev === row._sourceIndex ? null : row._sourceIndex,
                            )
                          }
                        >
                          <Pencil className="size-3.5" />
                          Fix
                        </Button>
                      )}
                    </td>
                  </motion.tr>
                  <AnimatePresence>
                    {editingIndex === row._sourceIndex && row._errors.length > 0 && (
                      <motion.tr
                        key={`${row._sourceIndex}-fix`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <td colSpan={8} className="p-0">
                          <ImportRowFixPanel
                            row={row}
                            onUpdate={(patch) => onUpdateRow(row._sourceIndex, patch)}
                            onClose={() => setEditingIndex(null)}
                          />
                        </td>
                      </motion.tr>
                    )}
                  </AnimatePresence>
                </Fragment>
              ))
            )}
          </tbody>
        </table>
        {hiddenCount > 0 && (
          <div className="px-6 py-3 text-center text-xs text-muted-foreground">
            +{hiddenCount} more row{hiddenCount === 1 ? "" : "s"} not shown. Switch to &ldquo;Needs
            attention&rdquo; to review problem rows, or import valid rows now.
          </div>
        )}
      </div>
    </GlassCard>
  );
}
