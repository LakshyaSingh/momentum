import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { getDashboardSnapshot } from "@/lib/dashboard-data";
import { weekSeriesFromDailyCounts } from "@/lib/streak";
import { greetingForTimezone } from "@/lib/timezone";
import { GlassCard } from "@/components/glass/glass-card";
import { DailyGoal } from "@/components/dashboard/daily-goal";
import { StreakDisplay } from "@/components/dashboard/streak-display";
import { WeekSparkline } from "@/components/dashboard/week-sparkline";
import { RecentApplications } from "@/components/dashboard/recent-applications";
import { QuickAdd } from "@/components/applications/quick-add";
import { AnimatedNumber } from "@/components/dashboard/animated-number";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import type { SessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const timeZone = user.timezone || "UTC";
  const firstName = user.name?.split(" ")[0] ?? "you";

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-sm text-muted-foreground">{greetingForTimezone(timeZone)},</p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-display-lg font-semibold tracking-tighter">{firstName}.</h1>
          <QuickAdd />
        </div>
      </header>

      <Suspense fallback={<DashboardBodySkeleton />}>
        <DashboardBody user={user} />
      </Suspense>
    </div>
  );
}

async function DashboardBody({ user }: { user: SessionUser }) {
  const timeZone = user.timezone || "UTC";
  const snapshot = await getDashboardSnapshot(user.id, timeZone);
  const days = weekSeriesFromDailyCounts(snapshot.streaks.dailyCounts, timeZone, 7);
  const { streaks, totalAll, recentRows, weekTotal } = snapshot;

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <GlassCard panel className="flex flex-col items-center justify-center px-6 py-10 md:col-span-1">
          <DailyGoal today={streaks.appliedToday} goal={user.dailyGoal} />
        </GlassCard>
        <div className="grid grid-cols-1 gap-4 md:col-span-2">
          <StreakDisplay current={streaks.current} longest={streaks.longest} />
          <StatTile
            label="All time"
            value={totalAll}
            suffix={totalAll === 1 ? "application" : "applications"}
          />
        </div>
      </div>

      <ScrollReveal>
        <GlassCard className="p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium text-muted-foreground">Last 7 days</h2>
              <p className="mt-1 text-xl font-medium tracking-tight">
                {weekTotal} application{weekTotal === 1 ? "" : "s"}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Best: {Math.max(...days.map((d) => d.count))} in a day
            </p>
          </div>
          <WeekSparkline series={days} />
        </GlassCard>
      </ScrollReveal>

      <ScrollReveal>
        <RecentApplications rows={recentRows} />
      </ScrollReveal>
    </>
  );
}

function DashboardBodySkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="h-48 rounded-3xl bg-muted/35 md:col-span-1" />
        <div className="grid gap-4 md:col-span-2">
          <div className="h-28 rounded-3xl bg-muted/35" />
          <div className="h-24 rounded-3xl bg-muted/30" />
        </div>
      </div>
      <div className="h-56 rounded-3xl bg-muted/30" />
    </div>
  );
}

function StatTile({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <GlassCard className="p-5">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <AnimatedNumber value={value} className="text-display-md font-semibold tracking-tighter" />
        {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
      </div>
    </GlassCard>
  );
}
