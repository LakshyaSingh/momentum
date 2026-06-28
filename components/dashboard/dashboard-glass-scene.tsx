import { ArrowRight, Flame, Plus } from "lucide-react";
import { STATUS_LABELS, statusColor } from "@/components/applications/status-pill";
import type { ApplicationRow } from "@/components/applications/data-table";
import { clamp, formatRelative, isoDateKey } from "@/lib/utils";

type Day = { date: Date; count: number };

interface DashboardGlassSceneProps {
  greeting: string;
  firstName: string;
  today: number;
  goal: number;
  currentStreak: number;
  longestStreak: number;
  totalAll: number;
  weekTotal: number;
  days: Day[];
  recentRows: ApplicationRow[];
}

export function DashboardGlassScene(props: DashboardGlassSceneProps) {
  return (
    <div className="declarative-dashboard-scene min-h-svh bg-background dark:bg-black">
      <main className="mx-auto w-full max-w-6xl px-4 pb-32 pt-36 sm:px-6 md:pt-40 lg:px-8">
        <div className="space-y-8">
          <header className="space-y-2">
            <p className="text-sm text-muted-foreground">{props.greeting},</p>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h1 className="text-display-lg font-semibold tracking-tighter">
                {props.firstName}.
              </h1>
              <span className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium tracking-tight text-background">
                <Plus className="size-4" />
                New application
              </span>
            </div>
          </header>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <SceneCard panel className="flex flex-col items-center justify-center px-6 py-10 md:col-span-1">
              <SceneDailyGoal today={props.today} goal={props.goal} />
            </SceneCard>
            <div className="grid grid-cols-1 gap-4 md:col-span-2">
              <SceneStreak current={props.currentStreak} longest={props.longestStreak} />
              <SceneCard className="p-5">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  All time
                </p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-display-md font-semibold tracking-tighter">
                    {props.totalAll}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {props.totalAll === 1 ? "application" : "applications"}
                  </span>
                </div>
              </SceneCard>
            </div>
          </div>

          <SceneCard className="p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-medium text-muted-foreground">Last 7 days</h2>
                <p className="mt-1 text-xl font-medium tracking-tight">
                  {props.weekTotal} application{props.weekTotal === 1 ? "" : "s"}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Best: {Math.max(...props.days.map((day) => day.count))} in a day
              </p>
            </div>
            <SceneWeekSparkline days={props.days} />
          </SceneCard>

          <SceneRecentApplications rows={props.recentRows} />
        </div>
      </main>
    </div>
  );
}

function SceneCard({
  panel = false,
  className,
  children,
}: {
  panel?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${panel ? "dashboard-scene-panel" : "dashboard-scene-card"} ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

function SceneDailyGoal({ today, goal }: { today: number; goal: number }) {
  const size = 220;
  const stroke = 16;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const fraction = clamp(today / Math.max(1, goal), 0, 1);

  return (
    <div className="relative inline-flex size-[220px]">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-foreground/[0.08]"
          strokeLinecap="round"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className={fraction >= 1 ? "stroke-emerald-500" : "stroke-foreground"}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Today</p>
        <div className="mt-1 flex items-baseline gap-1">
          <span className="text-display-lg font-semibold tracking-tighter">{today}</span>
          <span className="text-2xl font-medium text-muted-foreground">/{goal}</span>
        </div>
        <p className="mt-2 max-w-32 text-balance text-xs leading-snug text-muted-foreground">
          {today >= goal
            ? "Goal met. Beautiful."
            : today === 0
              ? "One application starts the day."
              : `${goal - today} to go.`}
        </p>
      </div>
    </div>
  );
}

function SceneStreak({ current, longest }: { current: number; longest: number }) {
  return (
    <SceneCard className="relative overflow-hidden p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Current streak
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-display-md font-semibold tracking-tighter">{current}</span>
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
    </SceneCard>
  );
}

function SceneWeekSparkline({ days }: { days: Day[] }) {
  const max = Math.max(1, ...days.map((day) => day.count));
  const todayKey = isoDateKey(new Date());

  return (
    <div className="flex items-end gap-2 sm:gap-3">
      {days.map((day) => {
        const height = (day.count / max) * 100;
        const isToday = isoDateKey(day.date) === todayKey;
        return (
          <div key={day.date.toISOString()} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex h-24 w-full items-end rounded-md">
              <div
                className={`w-full rounded-md ${isToday ? "bg-foreground" : "bg-foreground/15"}`}
                style={{ height: `${height}%`, minHeight: 2 }}
              />
            </div>
            <span className={`text-[10px] uppercase tracking-wider ${isToday ? "text-foreground" : "text-muted-foreground"}`}>
              {day.date.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 1)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function SceneRecentApplications({ rows }: { rows: ApplicationRow[] }) {
  return (
    <SceneCard className="p-4 sm:p-6">
      <header className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-medium tracking-tight text-muted-foreground">Recent</h2>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          See all <ArrowRight className="size-3" />
        </span>
      </header>
      {rows.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          You haven&apos;t logged any applications yet. Start with one.
        </p>
      ) : (
        <ul className="space-y-1">
          {rows.map((row) => (
            <li key={row.id} className="-mx-3 flex items-start gap-3 rounded-xl px-3 py-2.5 md:items-center">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold uppercase md:mt-0">
                {row.company.slice(0, 2)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-0.5 md:flex-row md:items-center md:gap-2">
                  <span className="font-medium leading-snug tracking-tight">{row.company}</span>
                  <span className="line-clamp-2 text-sm leading-snug text-muted-foreground md:line-clamp-1 md:truncate">
                    <span className="hidden md:inline">· </span>
                    {row.role}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground md:mt-0">
                  {formatRelative(row.applicationDate)}
                </p>
              </div>
              <span
                className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium"
                style={{
                  color: statusColor(row.status),
                  background: `color-mix(in srgb, ${statusColor(row.status)} 10%, transparent)`,
                  borderColor: `color-mix(in srgb, ${statusColor(row.status)} 25%, transparent)`,
                }}
              >
                <span className="size-1.5 rounded-full" style={{ background: statusColor(row.status) }} />
                {STATUS_LABELS[row.status]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </SceneCard>
  );
}
