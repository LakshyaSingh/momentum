"use client";

import { motion } from "framer-motion";
import { GlassCard } from "@/components/glass/glass-card";

interface TopCompaniesProps {
  rows: { company: string; total: number; positive: number; rate: number }[];
}

export function TopCompanies({ rows }: TopCompaniesProps) {
  const max = Math.max(1, ...rows.map((r) => r.total));
  return (
    <GlassCard className="p-6">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
        Top companies
      </p>
      {rows.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">No data yet.</p>
      ) : (
        <ul className="mt-5 space-y-3">
          {rows.map((row, i) => (
            <li key={row.company} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium tracking-tight">{row.company}</span>
                <span className="text-muted-foreground">
                  {row.total}{" "}
                  {row.positive > 0 && (
                    <span className="text-emerald-500">· {row.positive} positive</span>
                  )}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-foreground/10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(row.total / max) * 100}%` }}
                  transition={{ duration: 0.8, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full rounded-full bg-foreground"
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </GlassCard>
  );
}
