"use client";

import { ProgressRing } from "./progress-ring";
import { AnimatedNumber } from "./animated-number";

export function DailyGoal({ today, goal }: { today: number; goal: number }) {
  const pct = goal > 0 ? Math.min(1, today / goal) : 0;
  return (
    <ProgressRing
      value={today}
      max={goal}
      size={220}
      stroke={16}
      trackClass="stroke-foreground/[0.08]"
      fillClass={pct >= 1 ? "stroke-emerald-500" : "stroke-foreground"}
      ariaLabel={`Today's goal progress: ${today} of ${goal}`}
    >
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Today</p>
      <div className="mt-1 flex items-baseline gap-1">
        <AnimatedNumber value={today} className="text-display-lg font-semibold tracking-tighter" />
        <span className="text-2xl font-medium text-muted-foreground">/{goal}</span>
      </div>
      <p className="mt-2 max-w-32 text-balance text-xs leading-snug text-muted-foreground">
        {today >= goal
          ? "Goal met. Beautiful."
          : today === 0
          ? "One application starts the day."
          : `${goal - today} to go.`}
      </p>
    </ProgressRing>
  );
}
