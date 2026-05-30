"use client";

import { CalendarDays, Flame, Sparkles, TrendingUp, Trophy, Star, Mail } from "lucide-react";
import { GlassCard } from "@/components/glass/glass-card";
import { AnimatedNumber } from "@/components/dashboard/animated-number";
import type { ProductivityStats } from "@/lib/analytics";

export function ProductivityCards({ stats }: { stats: ProductivityStats }) {
  const cards: {
    label: string;
    Icon: React.ComponentType<{ className?: string }>;
    value: React.ReactNode;
    sub?: string;
  }[] = [
    {
      label: "Total",
      Icon: Sparkles,
      value: <AnimatedNumber value={stats.total} className="text-display-md font-semibold tracking-tighter" />,
      sub: "applications logged",
    },
    {
      label: "Best day",
      Icon: Trophy,
      value: stats.bestDay ? (
        <span className="text-display-md font-semibold tracking-tighter">
          <AnimatedNumber value={stats.bestDay.count} />
        </span>
      ) : (
        <span className="text-display-md font-semibold tracking-tighter text-muted-foreground/60">-</span>
      ),
      sub: stats.bestDay
        ? stats.bestDay.date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : "no data yet",
    },
    {
      label: "Per week",
      Icon: TrendingUp,
      value: (
        <AnimatedNumber
          value={stats.avgPerWeek}
          format={(n) => n.toFixed(1)}
          className="text-display-md font-semibold tracking-tighter"
        />
      ),
      sub: "average",
    },
    {
      label: "Longest streak",
      Icon: Flame,
      value: <AnimatedNumber value={stats.longestStreak} className="text-display-md font-semibold tracking-tighter" />,
      sub: stats.longestStreak === 1 ? "day" : "days",
    },
    {
      label: "Most active month",
      Icon: CalendarDays,
      value: stats.mostActiveMonth ? (
        <span className="text-display-sm font-semibold tracking-tighter">{stats.mostActiveMonth.label}</span>
      ) : (
        <span className="text-display-sm font-semibold tracking-tighter text-muted-foreground/60">-</span>
      ),
      sub: stats.mostActiveMonth ? `${stats.mostActiveMonth.count} applications` : "no data yet",
    },
    {
      label: "Response rate",
      Icon: Mail,
      value: (
        <AnimatedNumber
          value={Math.round(stats.responseRate * 100)}
          format={(n) => `${Math.round(n)}%`}
          className="text-display-md font-semibold tracking-tighter"
        />
      ),
      sub: "anything beyond Applied",
    },
    {
      label: "Interview rate",
      Icon: Star,
      value: (
        <AnimatedNumber
          value={Math.round(stats.interviewRate * 100)}
          format={(n) => `${Math.round(n)}%`}
          className="text-display-md font-semibold tracking-tighter"
        />
      ),
      sub: "of all applications",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((c) => (
        <GlassCard key={c.label} className="p-5">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            <c.Icon className="size-3.5" />
            {c.label}
          </div>
          <div className="mt-2">{c.value}</div>
          {c.sub && <p className="mt-1 text-xs text-muted-foreground">{c.sub}</p>}
        </GlassCard>
      ))}
    </div>
  );
}
