"use client";

import { motion } from "framer-motion";
import { GlassCard } from "@/components/glass/glass-card";
import type { FunnelStage } from "@/lib/analytics";

const STAGE_COLORS: Record<string, string> = {
  applied: "hsl(var(--status-applied))",
  response: "hsl(var(--status-screen))",
  interview: "hsl(var(--status-interview))",
  final: "hsl(var(--status-final))",
  offer: "hsl(var(--status-offer))",
};

export function FunnelChart({ stages }: { stages: FunnelStage[] }) {
  const max = stages[0]?.count ?? 0;

  return (
    <GlassCard className="p-6">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Funnel</p>
      {max === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Once you start logging, your funnel will fill in.
        </p>
      ) : (
        <div className="mt-5 space-y-3">
          {stages.map((s, i) => {
            const fraction = max > 0 ? s.count / max : 0;
            const conversion =
              i === 0
                ? 1
                : stages[i - 1]!.count === 0
                  ? 0
                : s.count / stages[i - 1]!.count;
            return (
              <div key={s.key} className="space-y-1.5">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium tracking-tight">{s.label}</span>
                  <span className="text-muted-foreground">
                    {s.count}
                    {i > 0 && (
                      <span className="ml-2 text-xs text-muted-foreground/80">
                        {Math.round(conversion * 100)}%
                      </span>
                    )}
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-foreground/[0.05]">
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: fraction }}
                    transition={{ duration: 0.8, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                    style={{
                      transformOrigin: "left",
                      background: STAGE_COLORS[s.key],
                    }}
                    className="h-full rounded-full"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
}
