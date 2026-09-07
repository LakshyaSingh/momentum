import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDashboardSnapshot } from "@/lib/dashboard-data";
import { QueueReminder } from "@/components/dashboard/queue-reminder";
import { daysWaiting } from "@/lib/queued-jobs";
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
import { DeclarativeGlassSceneRegistration } from "@/components/glass/declarative-glass-scene";
import { DashboardGlassScene } from "@/components/dashboard/dashboard-glass-scene";

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
        <DashboardBody
          user={user}
          greeting={greetingForTimezone(timeZone)}
          firstName={firstName}
        />
      </Suspense>
    </div>
  );
}

async function DashboardBody({
  user,
  greeting,
  firstName,
}: {
  user: SessionUser;
  greeting: string;
  firstName: string;
}) {
  const timeZone = user.timezone || "UTC";
  // Queued jobs are read outside `getDashboardSnapshot` on purpose. That
  // snapshot is cached against `applicationStatsTag`, so folding the queue into
  // it would force every queue mutation to throw away correct application
  // metrics. The page is already force-dynamic, so an uncached count is cheap.
  const [snapshot, queuedCount, oldestQueued] = await Promise.all([
    getDashboardSnapshot(user.id, timeZone),
    prisma.queuedJob.count({ where: { userId: user.id } }),
    prisma.queuedJob.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
  ]);
  const days = weekSeriesFromDailyCounts(snapshot.streaks.dailyCounts, timeZone, 7);
  const { streaks, totalAll, recentRows, weekTotal } = snapshot;

  return (
    <>
      <DeclarativeGlassSceneRegistration id="dashboard">
        <DashboardGlassScene
          greeting={greeting}
          firstName={firstName}
          today={streaks.appliedToday}
          goal={user.dailyGoal}
          currentStreak={streaks.current}
          longestStreak={streaks.longest}
          totalAll={totalAll}
          weekTotal={weekTotal}
          days={days}
          recentRows={recentRows}
        />
      </DeclarativeGlassSceneRegistration>
      <QueueReminder
        count={queuedCount}
        oldestDays={
          oldestQueued ? daysWaiting(oldestQueued.createdAt.toISOString()) : 0
        }
      />

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
