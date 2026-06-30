"use client";

import { useState } from "react";
import {
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import type { ApplicationStatus } from "@prisma/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { ApplicationSheet } from "./application-sheet";
import { CompanyLogo } from "./company-logo";
import { FilterBar, type ApplicationFilters } from "./filter-bar";
import { StatusPill, STATUS_LABELS, STATUS_ORDER } from "./status-pill";
import { GlassCard } from "@/components/glass/glass-card";
import { cn, formatDate } from "@/lib/utils";
import { responseReceivedForStatus } from "@/lib/response-received";
import type { ApplicationInput } from "@/lib/validators";
import {
  deleteApplication,
  transitionStatus,
} from "@/app/actions/applications";
import {
  clearApplicationsIndexWarmCache,
  warmApplicationsNavigation,
} from "@/lib/applications-index-client";

export interface ApplicationRow {
  id: string;
  company: string;
  companyDomain: string | null;
  role: string;
  location: string | null;
  jobLink: string | null;
  applicationDate: string; // ISO
  status: ApplicationStatus;
  salary: string | null;
  recruiter: string | null;
  referral: string | null;
  notes: string | null;
  followUpDate: string | null;
  responseReceived: boolean;
  interviewStage: string | null;
  offerStatus: string | null;
}

type SortKey = "applicationDate" | "company" | "role" | "status";

type DataTableProps = {
  rows: ApplicationRow[];
  total: number;
  filteredTotal: number;
  filters: ApplicationFilters;
  sort: { key: SortKey; dir: "asc" | "desc" };
  onFiltersChange: (next: ApplicationFilters) => void;
  onSortChange: (next: { key: SortKey; dir: "asc" | "desc" }) => void;
  onRowUpdated?: (id: string, patch: Partial<ApplicationRow>) => void;
  onRowDeleted?: (id: string) => void;
};

export function DataTable({
  rows,
  total,
  filteredTotal,
  filters,
  sort,
  onFiltersChange,
  onSortChange,
  onRowUpdated,
  onRowDeleted,
}: DataTableProps) {
  const [editing, setEditing] = useState<ApplicationRow | null>(null);

  function toggleSort(key: SortKey) {
    onSortChange(
      sort.key === key
        ? { key, dir: sort.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );
  }

  return (
    <div className="space-y-4">
      <FilterBar
        filters={filters}
        onChange={onFiltersChange}
        total={total}
        showing={filteredTotal}
      />

      <GlassCard className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 text-xs uppercase tracking-wider text-muted-foreground">
                <Th onClick={() => toggleSort("company")} sorted={sort.key === "company" ? sort.dir : null}>
                  Company
                </Th>
                <Th onClick={() => toggleSort("role")} sorted={sort.key === "role" ? sort.dir : null}>
                  Role
                </Th>
                <Th onClick={() => toggleSort("status")} sorted={sort.key === "status" ? sort.dir : null}>
                  Status
                </Th>
                <Th
                  onClick={() => toggleSort("applicationDate")}
                  sorted={sort.key === "applicationDate" ? sort.dir : null}
                >
                  Applied
                </Th>
                <th className="px-4 py-3 text-left font-medium">Location</th>
                <th className="w-10 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="group cursor-pointer border-b border-border/30 transition-colors hover:bg-background/40"
                  onClick={() => setEditing(row)}
                >
                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center gap-2.5">
                        <CompanyLogo
                          company={row.company}
                          jobLink={row.jobLink}
                          companyDomain={row.companyDomain}
                          size="xs"
                        />
                        <span>{row.company}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-foreground/80">
                      <div className="flex items-center gap-2">
                        {row.role}
                        {row.jobLink && (
                          <a
                            href={row.jobLink}
                            onClick={(e) => e.stopPropagation()}
                            target="_blank"
                            rel="noreferrer"
                            className="text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                            aria-label="Open job link"
                          >
                            <ExternalLink className="size-3.5" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={row.status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(row.applicationDate)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{row.location ?? "-"}</td>
                    <td className="px-2 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <RowActions
                        row={row}
                        onEdit={() => setEditing(row)}
                        onRowUpdated={onRowUpdated}
                        onRowDeleted={onRowDeleted}
                      />
                    </td>
                  </tr>
                ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-muted-foreground">
                    No applications match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {editing && (
        <ApplicationSheet
          open={!!editing}
          onOpenChange={(open) => !open && setEditing(null)}
          mode={{
            kind: "edit",
            id: editing.id,
            defaults: {
              company: editing.company,
              companyDomain: editing.companyDomain ?? undefined,
              role: editing.role,
              location: editing.location ?? undefined,
              jobLink: editing.jobLink ?? undefined,
              applicationDate: new Date(editing.applicationDate),
              status: editing.status,
              salary: editing.salary ?? undefined,
              recruiter: editing.recruiter ?? undefined,
              referral: editing.referral ?? undefined,
              notes: editing.notes ?? undefined,
              followUpDate: editing.followUpDate ? new Date(editing.followUpDate) : null,
              interviewStage: editing.interviewStage ?? undefined,
              offerStatus: editing.offerStatus ?? undefined,
            },
          }}
          onSaved={(values) =>
            onRowUpdated?.(editing.id, applicationInputToRowPatch(values))
          }
        />
      )}
    </div>
  );
}

function Th({
  children,
  onClick,
  sorted,
}: {
  children: React.ReactNode;
  onClick: () => void;
  sorted: "asc" | "desc" | null;
}) {
  return (
    <th className="px-4 py-3 text-left font-medium">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1.5 transition-colors hover:text-foreground",
          sorted ? "text-foreground" : "",
        )}
      >
        {children}
        {sorted === "asc" ? (
          <ChevronUp className="size-3.5" />
        ) : sorted === "desc" ? (
          <ChevronDown className="size-3.5" />
        ) : (
          <ArrowUpDown className="size-3.5 opacity-50" />
        )}
      </button>
    </th>
  );
}

function RowActions({
  row,
  onEdit,
  onRowUpdated,
  onRowDeleted,
}: {
  row: ApplicationRow;
  onEdit: () => void;
  onRowUpdated?: (id: string, patch: Partial<ApplicationRow>) => void;
  onRowDeleted?: (id: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Row actions">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[12rem]" liquidGlass>
        <DropdownMenuItem onSelect={onEdit}>
          <Pencil className="mr-2 size-4" /> Edit
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Move to</DropdownMenuLabel>
        {STATUS_ORDER.filter((s) => s !== row.status).map((s) => (
          <DropdownMenuItem
            key={s}
            onSelect={async () => {
              onRowUpdated?.(row.id, {
                status: s,
                responseReceived: responseReceivedForStatus(s),
              });
              const res = await transitionStatus(row.id, s);
              if (res.ok) {
                clearApplicationsIndexWarmCache();
                warmApplicationsNavigation(undefined, { forceIndex: true });
                toast.success(`Moved to ${STATUS_LABELS[s]}`);
              } else {
                onRowUpdated?.(row.id, {
                  status: row.status,
                  responseReceived: row.responseReceived,
                });
                toast.error(res.error ?? "Could not update status");
              }
            }}
          >
            <span className="mr-2 inline-block size-2 rounded-full" style={{ background: `hsl(var(--status-${tokenForStatus(s)}))` }} />
            {STATUS_LABELS[s]}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-red-500 focus:text-red-500"
          onSelect={async () => {
            const res = await deleteApplication(row.id);
            if (res.ok) {
              clearApplicationsIndexWarmCache();
              warmApplicationsNavigation(undefined, { forceIndex: true });
              onRowDeleted?.(row.id);
              toast.success("Deleted");
            } else {
              toast.error("Could not delete application");
            }
          }}
        >
          <Trash2 className="mr-2 size-4" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function tokenForStatus(s: ApplicationStatus) {
  switch (s) {
    case "APPLIED": return "applied";
    case "OA": return "oa";
    case "RECRUITER_SCREEN": return "screen";
    case "INTERVIEW": return "interview";
    case "FINAL_ROUND": return "final";
    case "OFFER": return "offer";
    case "REJECTED": return "rejected";
    case "GHOSTED": return "ghosted";
    case "WITHDRAWN": return "withdrawn";
  }
}

function applicationInputToRowPatch(values: Partial<ApplicationInput>): Partial<ApplicationRow> {
  return {
    ...(values.company !== undefined ? { company: values.company } : {}),
    ...(values.companyDomain !== undefined ? { companyDomain: values.companyDomain ?? null } : {}),
    ...(values.role !== undefined ? { role: values.role } : {}),
    ...(values.location !== undefined ? { location: values.location ?? null } : {}),
    ...(values.jobLink !== undefined ? { jobLink: values.jobLink ?? null } : {}),
    ...(values.applicationDate !== undefined
      ? { applicationDate: values.applicationDate.toISOString() }
      : {}),
    ...(values.status !== undefined
      ? {
          status: values.status,
          responseReceived: responseReceivedForStatus(values.status),
        }
      : {}),
    ...(values.salary !== undefined ? { salary: values.salary ?? null } : {}),
    ...(values.recruiter !== undefined ? { recruiter: values.recruiter ?? null } : {}),
    ...(values.referral !== undefined ? { referral: values.referral ?? null } : {}),
    ...(values.notes !== undefined ? { notes: values.notes ?? null } : {}),
    ...(values.followUpDate !== undefined
      ? { followUpDate: values.followUpDate?.toISOString() ?? null }
      : {}),
    ...(values.interviewStage !== undefined
      ? { interviewStage: values.interviewStage ?? null }
      : {}),
    ...(values.offerStatus !== undefined ? { offerStatus: values.offerStatus ?? null } : {}),
  };
}
