"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SeriesPoint } from "@/lib/analytics";
import { ChartTooltip } from "@/components/charts/chart-tooltip";
import { GlassCard } from "@/components/glass/glass-card";

export function ApplicationsOverTime({ data, range }: { data: SeriesPoint[]; range: string }) {
  const total = data.reduce((s, p) => s + p.count, 0);
  return (
    <GlassCard className="overflow-hidden p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Applications over time
          </p>
          <p className="mt-1 text-2xl font-medium tracking-tight">
            {total} <span className="text-sm font-normal text-muted-foreground">in {range}</span>
          </p>
        </div>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 0, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="appAreaFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity={0.45} />
                <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              fontSize={11}
              tick={{ fill: "hsl(var(--muted-foreground))" }}
              minTickGap={20}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              fontSize={11}
              tick={{ fill: "hsl(var(--muted-foreground))" }}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ stroke: "hsl(var(--foreground))", strokeOpacity: 0.15 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0]!.payload as SeriesPoint;
                return (
                  <ChartTooltip
                    label={p.label}
                    value={`${p.count} application${p.count === 1 ? "" : "s"}`}
                  />
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="hsl(var(--foreground))"
              strokeWidth={2}
              fill="url(#appAreaFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}
