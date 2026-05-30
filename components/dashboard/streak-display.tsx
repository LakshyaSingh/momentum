"use client";

import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { AnimatedNumber } from "./animated-number";
import { GlassCard } from "@/components/glass/glass-card";

export function StreakDisplay({
  current,
  longest,
}: {
  current: number;
  longest: number;
}) {
  return (
    <GlassCard className="relative overflow-hidden p-6">
      {current > 0 && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-12 size-48 rounded-full bg-orange-500/20 blur-3xl"
          animate={{ opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Current streak
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <AnimatedNumber value={current} className="text-display-md font-semibold tracking-tighter" />
            <span className="text-sm text-muted-foreground">{current === 1 ? "day" : "days"}</span>
          </div>
        </div>
        <div className="flex size-12 items-center justify-center rounded-2xl bg-orange-500/10 ring-1 ring-orange-500/20">
          <Flame className="size-6 text-orange-500" />
        </div>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        {current === 0
          ? "Log one application today to start your streak."
          : current < longest
          ? `Your record is ${longest} days. You can break it.`
          : current >= 100
          ? "Few people get this far. Keep going."
          : current >= 30
          ? "This is who you are now. A job-hunt machine."
          : "Don't break the chain."}
      </p>
    </GlassCard>
  );
}
