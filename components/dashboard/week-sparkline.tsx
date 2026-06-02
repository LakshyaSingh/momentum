"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { isoDateKey } from "@/lib/utils";
import { ChartTooltip } from "@/components/charts/chart-tooltip";

interface WeekSparklineProps {
  /** Last 7 days, oldest -> newest, with applicationCount per day */
  series: { date: Date; count: number }[];
}

function formatDayLabel(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function WeekSparkline({ series }: WeekSparklineProps) {
  const max = Math.max(1, ...series.map((s) => s.count));
  const todayKey = isoDateKey(new Date());
  // Self-managed hover state. We deliberately avoid the Radix hover Tooltip
  // here: in Safari its pointer detection on a transparent <button> wrapping a
  // framer-motion bar was unreliable (the tooltip flickered open/closed or
  // never appeared). onMouseEnter/Leave fire reliably across browsers, and the
  // tooltip itself is pointer-events-none so it can't re-trigger leave events.
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div className="flex items-end gap-2 sm:gap-3">
      {series.map((d, i) => {
        const h = (d.count / max) * 100;
        const isToday = isoDateKey(d.date) === todayKey;
        const dayLabel = d.date.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 1);
        const dateLabel = formatDayLabel(d.date);

        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-2">
            <div className="relative w-full">
              {hovered === i && (
                <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap animate-in fade-in-0 zoom-in-95">
                  <ChartTooltip
                    label={dateLabel}
                    value={`${d.count} application${d.count === 1 ? "" : "s"}`}
                  />
                </div>
              )}
              <button
                type="button"
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered((cur) => (cur === i ? null : cur))}
                onFocus={() => setHovered(i)}
                onBlur={() => setHovered((cur) => (cur === i ? null : cur))}
                className="flex h-24 w-full items-end rounded-md bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                aria-label={`${d.count} application${d.count === 1 ? "" : "s"} on ${dateLabel}`}
              >
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${h}%` }}
                  transition={{ duration: 0.7, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                  className={`pointer-events-none w-full rounded-md ${isToday ? "bg-foreground" : "bg-foreground/15"}`}
                  style={{ minHeight: 2 }}
                />
              </button>
            </div>
            <span
              className={`text-[10px] uppercase tracking-wider ${isToday ? "text-foreground" : "text-muted-foreground"}`}
            >
              {dayLabel}
            </span>
          </div>
        );
      })}
    </div>
  );
}
