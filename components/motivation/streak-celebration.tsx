"use client";

import { useEffect, useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Flame } from "lucide-react";
import { useMotivationStore } from "@/stores/motivation-store";

const MILESTONE_COPY: Record<number, { title: string; sub: string }> = {
  3: { title: "Three days in a row.", sub: "A habit is forming." },
  7: { title: "One week strong.", sub: "Consistency compounds." },
  14: { title: "Two solid weeks.", sub: "This is who you are now." },
  30: { title: "Thirty days.", sub: "You have built momentum." },
  100: { title: "One hundred days.", sub: "Few people get here." },
};

export function StreakCelebration() {
  const pending = useMotivationStore((s) => s.pendingMilestone);
  const cinematicOpen = useMotivationStore((s) => s.current);
  const consume = useMotivationStore((s) => s.consumeMilestone);
  const reduce = useReducedMotion();

  const showing = pending && !cinematicOpen;
  const copy = pending ? MILESTONE_COPY[pending.milestone] : null;

  // Auto-dismiss after 4 seconds.
  useEffect(() => {
    if (!showing) return;
    const t = setTimeout(() => consume(), 4000);
    return () => clearTimeout(t);
  }, [showing, consume]);

  return (
    <AnimatePresence>
      {showing && copy && pending && (
        <motion.div
          key="streak-celebration"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="pointer-events-none fixed inset-0 z-[90] flex items-end justify-center px-4 pb-24 sm:items-center sm:pb-0"
          aria-live="polite"
        >
          {!reduce && <Confetti />}
          <motion.div
            initial={{ y: 60, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 240, damping: 24 }}
            className="pointer-events-auto glass-panel grain relative max-w-md cursor-pointer overflow-hidden p-6"
            onClick={consume}
          >
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-orange-500/15 ring-1 ring-orange-500/30">
                <Flame className="size-6 text-orange-500" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  {pending.milestone}-day streak
                </p>
                <h3 className="mt-1 text-xl font-semibold tracking-tight">{copy.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{copy.sub}</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const CONFETTI_COLORS = [
  "#fb923c", "#f59e0b", "#fbbf24",
  "#a855f7", "#22c55e", "#06b6d4",
  "#f43f5e",
];

function Confetti() {
  const particles = useMemo(
    () =>
      Array.from({ length: 60 }).map((_, i) => ({
        id: i,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]!,
        x: (Math.random() - 0.5) * 700,
        y: -200 - Math.random() * 400,
        rotate: Math.random() * 720 - 360,
        size: 6 + Math.random() * 6,
        delay: Math.random() * 0.25,
      })),
    [],
  );

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p) => (
        <motion.span
          key={p.id}
          initial={{ x: 0, y: 0, opacity: 0, rotate: 0 }}
          animate={{
            x: p.x,
            y: p.y,
            opacity: [0, 1, 1, 0],
            rotate: p.rotate,
          }}
          transition={{ duration: 1.6, delay: p.delay, ease: [0.22, 1, 0.36, 1] }}
          style={{
            background: p.color,
            width: p.size,
            height: p.size * 0.4,
            left: "50%",
            top: "50%",
            position: "absolute",
            borderRadius: 2,
          }}
        />
      ))}
    </div>
  );
}
