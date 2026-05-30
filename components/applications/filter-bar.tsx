"use client";

import { Search, X } from "lucide-react";
import { ApplicationStatus } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { STATUS_LABELS, STATUS_ORDER, statusColor } from "@/components/applications/status-pill";
import { cn } from "@/lib/utils";

export interface ApplicationFilters {
  search: string;
  statuses: ApplicationStatus[];
}

interface FilterBarProps {
  filters: ApplicationFilters;
  onChange: (next: ApplicationFilters) => void;
  total: number;
  showing: number;
}

export function FilterBar({ filters, onChange, total, showing }: FilterBarProps) {
  function toggleStatus(s: ApplicationStatus) {
    const has = filters.statuses.includes(s);
    onChange({
      ...filters,
      statuses: has ? filters.statuses.filter((x) => x !== s) : [...filters.statuses, s],
    });
  }

  const filtered = filters.search.length > 0 || filters.statuses.length > 0;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder="Search company, role, location, notes…"
          className="h-11 pl-11"
        />
        {filters.search && (
          <button
            onClick={() => onChange({ ...filters, search: "" })}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_ORDER.map((s) => {
          const active = filters.statuses.includes(s);
          return (
            <button
              key={s}
              type="button"
              onClick={() => toggleStatus(s)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all",
                active
                  ? "border-foreground/20 bg-foreground/5"
                  : "border-border bg-background/40 text-muted-foreground hover:bg-background/70",
              )}
              style={active ? { color: statusColor(s) } : undefined}
            >
              <span className="size-1.5 rounded-full" style={{ background: statusColor(s) }} />
              {STATUS_LABELS[s]}
            </button>
          );
        })}
        {filtered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange({ search: "", statuses: [] })}
            className="ml-auto h-7 px-3 text-xs"
          >
            Clear
          </Button>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {filtered ? `${showing} of ${total}` : `${total} application${total === 1 ? "" : "s"}`}
        </span>
      </div>
    </div>
  );
}
