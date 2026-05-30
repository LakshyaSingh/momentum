"use client";

import { useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";
import { GlassCard } from "@/components/glass/glass-card";
import { StatusPill } from "@/components/applications/status-pill";
import { isoDateKey } from "@/lib/utils";
import type { HeatmapApplication } from "@/lib/calendar-data";

export type { HeatmapApplication };

interface ContributionHeatmapProps {
  /** Sorted asc by applicationDate */
  applications: HeatmapApplication[];
  weeks?: number;
}

type HeatmapCell = {
  date: Date;
  key: string;
  count: number;
  apps: HeatmapApplication[];
};

function intensity(count: number) {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 6) return 3;
  return 4;
}

const INTENSITY_CLASSES = [
  "bg-foreground/5",
  "bg-foreground/15",
  "bg-foreground/30",
  "bg-foreground/55",
  "bg-foreground/85",
];

export function ContributionHeatmap({ applications, weeks = 53 }: ContributionHeatmapProps) {
  const [selected, setSelected] = useState<HeatmapCell | null>(null);

  const byDay = useMemo(() => {
    const map = new Map<string, HeatmapApplication[]>();
    for (const app of applications) {
      const key = isoDateKey(new Date(app.applicationDate));
      const existing = map.get(key) ?? [];
      existing.push(app);
      map.set(key, existing);
    }
    return map;
  }, [applications]);

  const cells = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    const dayOffset = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - dayOffset - (weeks - 1) * 7);

    const grid: HeatmapCell[][] = [];
    for (let w = 0; w < weeks; w++) {
      const col: HeatmapCell[] = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(start);
        date.setDate(date.getDate() + w * 7 + d);
        if (date > today) {
          col.push({ date, key: "future", count: -1, apps: [] });
        } else {
          const key = isoDateKey(date);
          const apps = byDay.get(key) ?? [];
          col.push({ date, key, count: apps.length, apps });
        }
      }
      grid.push(col);
    }
    return grid;
  }, [byDay, weeks]);

  const monthLabels = useMemo(() => {
    const labels: { weekIndex: number; label: string }[] = [];
    let lastMonth = -1;
    cells.forEach((col, index) => {
      const first = col[0]!;
      if (first.date.getMonth() !== lastMonth && index > 0 && index < cells.length - 1) {
        labels.push({
          weekIndex: index,
          label: first.date.toLocaleDateString("en-US", { month: "short" }),
        });
        lastMonth = first.date.getMonth();
      }
      if (index === 0) lastMonth = first.date.getMonth();
    });
    return labels;
  }, [cells]);

  const total = applications.length;
  const activeDays = byDay.size;
  const cellSize = 12;
  const cellGap = 3;

  return (
    <GlassCard className="overflow-hidden p-6">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Consistency
          </p>
          <p className="mt-1 text-2xl font-medium tracking-tight">
            {activeDays}{" "}
            <span className="text-sm font-normal text-muted-foreground">active days</span>
            <span className="ml-3 text-sm font-normal text-muted-foreground">
              {total} applications
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          Less
          {INTENSITY_CLASSES.map((cls, index) => (
            <span key={index} className={`size-3 rounded-sm ${cls}`} />
          ))}
          More
        </div>
      </div>

      <Popover
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <div className="overflow-x-auto pb-2">
          <div className="relative inline-block min-w-full">
            <div
              className="relative h-4"
              style={{ width: cells.length * (cellSize + cellGap) - cellGap, marginLeft: 24 }}
            >
              {monthLabels.map((label) => (
                <span
                  key={label.weekIndex}
                  className="absolute top-0 text-[10px] uppercase tracking-wider text-muted-foreground"
                  style={{ left: label.weekIndex * (cellSize + cellGap) }}
                >
                  {label.label}
                </span>
              ))}
            </div>

            <div className="flex">
              <div className="mr-2 flex flex-col gap-[3px] pt-[2px] text-[9px] text-muted-foreground">
                {["", "Mon", "", "Wed", "", "Fri", ""].map((label, index) => (
                  <span key={index} className="h-[12px] leading-[12px]">
                    {label}
                  </span>
                ))}
              </div>
              <div className="flex gap-[3px]">
                {cells.map((col, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col gap-[3px]">
                    {col.map((cell, dayIndex) => {
                      if (cell.count < 0) {
                        return <span key={dayIndex} className="size-3 rounded-sm bg-transparent" />;
                      }

                      const isSelected = selected?.key === cell.key;
                      const cls = INTENSITY_CLASSES[intensity(cell.count)];

                      return (
                        <button
                          key={`${cell.key}-${dayIndex}`}
                          type="button"
                          aria-label={`${cell.count} application${cell.count === 1 ? "" : "s"} on ${cell.date.toDateString()}`}
                          className={`size-3 rounded-sm transition-transform hover:scale-125 ${cls} ${
                            cell.count > 0 ? "cursor-pointer" : "cursor-default"
                          } ${isSelected ? "ring-1 ring-foreground/40" : ""}`}
                          onClick={() => {
                            if (cell.count > 0) setSelected(cell);
                          }}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {selected && selected.count > 0 && (
          <>
            <PopoverAnchor asChild>
              <span className="pointer-events-none fixed left-1/2 top-1/2 size-0" />
            </PopoverAnchor>
            <PopoverContent className="w-72 p-4" align="center">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                {selected.date.toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
              <p className="mt-1 text-lg font-medium">
                {selected.count} application{selected.count === 1 ? "" : "s"}
              </p>
              <ul className="mt-3 space-y-2">
                {selected.apps.slice(0, 5).map((app) => (
                  <li key={app.id} className="flex items-center justify-between gap-2 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium tracking-tight">{app.company}</p>
                      <p className="truncate text-xs text-muted-foreground">{app.role}</p>
                    </div>
                    <StatusPill status={app.status} />
                  </li>
                ))}
                {selected.apps.length > 5 && (
                  <li className="text-xs text-muted-foreground">
                    + {selected.apps.length - 5} more
                  </li>
                )}
              </ul>
            </PopoverContent>
          </>
        )}
      </Popover>
    </GlassCard>
  );
}
