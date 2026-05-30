import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { computeStreaksForUser } from "@/lib/streak";
import { getHeatmapApplications, heatmapSinceDate } from "@/lib/calendar-data";
import { ContributionHeatmap } from "@/components/calendar/contribution-heatmap";
import { GlassCard } from "@/components/glass/glass-card";
import { AnimatedNumber } from "@/components/dashboard/animated-number";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { Flame } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-display-md font-semibold tracking-tight">Consistency</h1>
        <p className="text-muted-foreground">Every dot is a day you showed up.</p>
      </header>

      <Suspense fallback={<CalendarBodySkeleton />}>
        <CalendarBody />
      </Suspense>
    </div>
  );
}

async function CalendarBody() {
  const user = await requireUser();
  const since = heatmapSinceDate();

  const [heatmap, streaks] = await Promise.all([
    getHeatmapApplications(user.id, since),
    computeStreaksForUser(user.id, user.timezone),
  ]);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <GlassCard className="p-5">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Current streak
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <AnimatedNumber value={streaks.current} className="text-display-md font-semibold tracking-tighter" />
            <span className="text-sm text-muted-foreground">days</span>
            <Flame className="ml-auto size-5 text-orange-500" />
          </div>
        </GlassCard>
        <GlassCard className="p-5">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Longest streak
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <AnimatedNumber value={streaks.longest} className="text-display-md font-semibold tracking-tighter" />
            <span className="text-sm text-muted-foreground">days</span>
          </div>
        </GlassCard>
        <GlassCard className="p-5">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Today</p>
          <div className="mt-2 flex items-baseline gap-2">
            <AnimatedNumber value={streaks.appliedToday} className="text-display-md font-semibold tracking-tighter" />
            <span className="text-sm text-muted-foreground">applications</span>
          </div>
        </GlassCard>
      </div>

      <ScrollReveal>
        <ContributionHeatmap applications={heatmap} />
      </ScrollReveal>
    </>
  );
}

function CalendarBodySkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="h-24 rounded-3xl bg-muted/35" />
        <div className="h-24 rounded-3xl bg-muted/35" />
        <div className="h-24 rounded-3xl bg-muted/35" />
      </div>
      <div className="h-44 rounded-3xl bg-muted/30" />
    </div>
  );
}
