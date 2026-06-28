import {
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Flame,
  ImageIcon,
  MoreHorizontal,
  Plus,
  Search,
  UploadCloud,
} from "lucide-react";
import type { ApplicationStatus } from "@prisma/client";
import {
  STATUS_LABELS,
  STATUS_ORDER,
  StatusPill,
  statusColor,
} from "@/components/applications/status-pill";
import type { ApplicationRow } from "@/components/applications/data-table";
import type { ApplicationsQuery } from "@/lib/applications-list";
import type {
  FunnelStage,
  ProductivityStats,
} from "@/lib/analytics";
import type { HeatmapApplication } from "@/lib/calendar-data";
import { formatDate, isoDateKey } from "@/lib/utils";

type AnalyticsApplication = {
  id: string;
  applicationDate: string;
  company: string;
  status: ApplicationStatus;
};

export function PrimaryGlassSceneFrame({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="declarative-dashboard-scene min-h-svh bg-background dark:bg-black">
      <main className="mx-auto w-full max-w-6xl px-4 pb-32 pt-36 sm:px-6 md:pt-40 lg:px-8">
        {children}
      </main>
    </div>
  );
}

function SceneCard({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={`dashboard-scene-card ${className}`}>{children}</div>;
}

function ScenePrimaryAction() {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium tracking-tight text-background">
      <Plus className="size-4" />
      New application
    </span>
  );
}

export function ApplicationsGlassScene({
  rows,
  total,
  filteredTotal,
  query,
}: {
  rows: ApplicationRow[];
  total: number;
  filteredTotal: number;
  query: ApplicationsQuery;
}) {
  const filtered = Boolean(query.search || query.statuses.length);

  return (
    <PrimaryGlassSceneFrame>
      <div className="space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-display-md font-semibold tracking-tight">Applications</h1>
            <p className="mt-1 text-muted-foreground">
              {total === 0
                ? "Log your first application. Momentum starts now."
                : `${total} ${total === 1 ? "application" : "applications"}, all in one place.`}
            </p>
          </div>
          <ScenePrimaryAction />
        </header>

        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex h-11 items-center rounded-md border border-input bg-background/40 px-4 text-sm text-muted-foreground">
              <Search className="mr-3 size-4" />
              {query.search || "Search company, role, location, notes..."}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {STATUS_ORDER.map((status) => (
                <span
                  key={status}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/40 px-3 py-1 text-xs font-medium text-muted-foreground"
                >
                  <span className="size-1.5 rounded-full" style={{ background: statusColor(status) }} />
                  {STATUS_LABELS[status]}
                </span>
              ))}
              <span className="ml-auto text-xs text-muted-foreground">
                {filtered ? `${filteredTotal} of ${total}` : `${total} application${total === 1 ? "" : "s"}`}
              </span>
            </div>
          </div>

          <SceneCard className="overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <SceneTableHeading label="Company" sortKey="company" query={query} />
                  <SceneTableHeading label="Role" sortKey="role" query={query} />
                  <SceneTableHeading label="Status" sortKey="status" query={query} />
                  <SceneTableHeading label="Applied" sortKey="applicationDate" query={query} />
                  <th className="px-4 py-3 text-left font-medium">Location</th>
                  <th className="w-10 px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-border/30">
                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-background/60 text-xs font-medium uppercase ring-1 ring-border/40">
                          {row.company.slice(0, 2)}
                        </span>
                        {row.company}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-foreground/80">
                      <div className="flex items-center gap-2">
                        {row.role}
                        {row.jobLink && (
                          <ExternalLink className="size-3.5 shrink-0 text-muted-foreground opacity-0" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={row.status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(row.applicationDate)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.location ?? "-"}</td>
                    <td className="px-2 py-3 text-right">
                      <span className="inline-flex size-8 items-center justify-center">
                        <MoreHorizontal className="size-4" />
                      </span>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center text-muted-foreground">
                      No applications match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </SceneCard>
        </div>
      </div>
    </PrimaryGlassSceneFrame>
  );
}

function SceneTableHeading({
  label,
  sortKey,
  query,
}: {
  label: string;
  sortKey: ApplicationsQuery["sort"];
  query: ApplicationsQuery;
}) {
  const sorted = query.sort === sortKey;

  return (
    <th className="px-4 py-3 text-left font-medium">
      <span className={`inline-flex items-center gap-1.5 ${sorted ? "text-foreground" : ""}`}>
        {label}
        {sorted ? (
          query.dir === "asc" ? (
            <ChevronUp className="size-3.5" />
          ) : (
            <ChevronDown className="size-3.5" />
          )
        ) : (
          <ArrowUpDown className="size-3.5 opacity-50" />
        )}
      </span>
    </th>
  );
}

export function AnalyticsGlassScene({
  applications,
  funnel,
  productivity,
}: {
  applications: AnalyticsApplication[];
  funnel: FunnelStage[];
  productivity: ProductivityStats;
}) {
  const companyCounts = new Map<string, number>();
  for (const application of applications) {
    companyCounts.set(application.company, (companyCounts.get(application.company) ?? 0) + 1);
  }
  const companies = Array.from(companyCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const maxCompany = Math.max(1, ...companies.map(([, count]) => count));
  const maxFunnel = Math.max(1, funnel[0]?.count ?? 0);
  const recentApplications = applications.filter(
    (application) =>
      new Date(application.applicationDate).getTime() >=
      Date.now() - 30 * 86_400_000,
  );
  const monthlyBars = analyticsBars(recentApplications);

  return (
    <PrimaryGlassSceneFrame>
      <div className="space-y-8">
        <header>
          <h1 className="text-display-md font-semibold tracking-tight">Analytics</h1>
          <p className="mt-1 text-muted-foreground">Patterns hide in your data. Here&apos;s what we found.</p>
        </header>

        <div className="space-y-6">
          <div className="flex justify-end">
            <div className="inline-flex rounded-full border border-border bg-background/40 p-1 text-xs text-muted-foreground">
              {["7d", "30d", "6mo", "1yr", "All"].map((range) => (
                <span key={range} className={`rounded-full px-3 py-1.5 ${range === "30d" ? "bg-foreground/10 text-foreground" : ""}`}>
                  {range}
                </span>
              ))}
            </div>
          </div>

          <SceneCard className="overflow-hidden p-6">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Applications over time</p>
            <p className="mt-1 text-2xl font-medium tracking-tight">
              {recentApplications.length} <span className="text-sm font-normal text-muted-foreground">in the last 30 days</span>
            </p>
            <div className="mt-6 flex h-56 items-end gap-2 border-b border-border/60 px-2">
              {monthlyBars.map((height, index) => (
                <span key={index} className="flex-1 rounded-t bg-foreground/20" style={{ height: `${height}%` }} />
              ))}
            </div>
          </SceneCard>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <SceneCard className="p-6">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Funnel</p>
              <div className="mt-5 space-y-3">
                {funnel.map((stage) => (
                  <div key={stage.key} className="space-y-1.5">
                    <div className="flex justify-between text-sm"><span>{stage.label}</span><span className="text-muted-foreground">{stage.count}</span></div>
                    <div className="h-3 overflow-hidden rounded-full bg-foreground/[0.05]">
                      <div className="h-full rounded-full bg-foreground/50" style={{ width: `${(stage.count / maxFunnel) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </SceneCard>

            <SceneCard className="p-6">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Top companies</p>
              <div className="mt-5 space-y-3">
                {companies.map(([company, count]) => (
                  <div key={company} className="space-y-1.5">
                    <div className="flex justify-between text-sm"><span>{company}</span><span className="text-muted-foreground">{count}</span></div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-foreground/10">
                      <div className="h-full rounded-full bg-foreground" style={{ width: `${(count / maxCompany) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </SceneCard>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {productivitySceneValues(productivity).map(({ label, value, sub }) => (
              <SceneCard key={label} className="p-5">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
                <p className="mt-2 text-display-md font-semibold tracking-tighter">{value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
              </SceneCard>
            ))}
          </div>
        </div>
      </div>
    </PrimaryGlassSceneFrame>
  );
}

export function CalendarGlassScene({
  heatmap,
  current,
  longest,
  today,
}: {
  heatmap: HeatmapApplication[];
  current: number;
  longest: number;
  today: number;
}) {
  const counts = new Map<string, number>();
  for (const application of heatmap) {
    const key = isoDateKey(new Date(application.applicationDate));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const cells = heatmapCells(counts);

  return (
    <PrimaryGlassSceneFrame>
      <div className="space-y-8">
        <header className="space-y-1">
          <h1 className="text-display-md font-semibold tracking-tight">Consistency</h1>
          <p className="text-muted-foreground">Every dot is a day you showed up.</p>
        </header>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            ["Current streak", current, true],
            ["Longest streak", longest, false],
            ["Today", today, false],
          ].map(([label, value, flame]) => (
            <SceneCard key={String(label)} className="p-5">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">{String(label)}</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-display-md font-semibold tracking-tighter">{Number(value)}</span>
                <span className="text-sm text-muted-foreground">{label === "Today" ? "applications" : "days"}</span>
                {flame && <Flame className="ml-auto size-5 text-orange-500" />}
              </div>
            </SceneCard>
          ))}
        </div>

        <SceneCard className="overflow-hidden p-6">
          <div className="mb-5 flex items-baseline justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Consistency</p>
              <p className="mt-1 text-2xl font-medium tracking-tight">
                {counts.size} <span className="text-sm font-normal text-muted-foreground">active days</span>
                <span className="ml-3 text-sm font-normal text-muted-foreground">{heatmap.length} applications</span>
              </p>
            </div>
          </div>
          <div className="flex min-w-[790px] gap-[3px] pt-4">
            {cells.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-[3px]">
                {week.map((count, dayIndex) => (
                  <span key={dayIndex} className={`size-3 rounded-sm ${heatmapIntensity(count)}`} />
                ))}
              </div>
            ))}
          </div>
        </SceneCard>
      </div>
    </PrimaryGlassSceneFrame>
  );
}

export function ImportGlassScene() {
  return (
    <PrimaryGlassSceneFrame>
      <div className="space-y-8">
        <header className="space-y-2">
          <h1 className="text-display-md font-semibold tracking-tight">Bring your history.</h1>
          <p className="max-w-prose text-muted-foreground">
            Drop your existing tracker. Excel, Numbers, Sheets, anything that exports to .xlsx or .csv.
          </p>
        </header>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="dashboard-scene-panel p-8 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-foreground/5 ring-1 ring-foreground/10">
              <UploadCloud className="size-7" />
            </div>
            <p className="mt-5 text-base font-medium tracking-tight">Drop your spreadsheet</p>
            <p className="mt-1 text-xs text-muted-foreground">.xlsx · .xls · .csv, or click to browse</p>
          </div>
          <div className="dashboard-scene-panel p-8 text-center opacity-60">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-foreground/5 ring-1 ring-foreground/10">
              <ImageIcon className="size-7" />
            </div>
            <p className="mt-5 text-base font-medium tracking-tight">Screenshot import</p>
            <p className="mt-1 text-xs text-muted-foreground">Coming soon</p>
          </div>
        </div>
      </div>
    </PrimaryGlassSceneFrame>
  );
}

function analyticsBars(applications: AnalyticsApplication[]) {
  const counts = Array.from({ length: 12 }, () => 0);
  for (const application of applications) {
    const bucket = new Date(application.applicationDate).getMonth() % counts.length;
    counts[bucket] += 1;
  }
  const max = Math.max(1, ...counts);
  return counts.map((count) => Math.max(2, (count / max) * 100));
}

function productivitySceneValues(stats: ProductivityStats) {
  return [
    { label: "Total", value: stats.total, sub: "applications logged" },
    { label: "Best day", value: stats.bestDay?.count ?? "-", sub: stats.bestDay ? formatDate(stats.bestDay.date) : "no data yet" },
    { label: "Per week", value: stats.avgPerWeek.toFixed(1), sub: "average" },
    { label: "Longest streak", value: stats.longestStreak, sub: stats.longestStreak === 1 ? "day" : "days" },
    { label: "Response rate", value: `${Math.round(stats.responseRate * 100)}%`, sub: "anything beyond Applied" },
    { label: "Interview rate", value: `${Math.round(stats.interviewRate * 100)}%`, sub: "of all applications" },
  ];
}

function heatmapCells(counts: Map<string, number>) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  const dayOffset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - dayOffset - 52 * 7);

  return Array.from({ length: 53 }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => {
      const date = new Date(start);
      date.setDate(start.getDate() + week * 7 + day);
      return date > today ? -1 : counts.get(isoDateKey(date)) ?? 0;
    }),
  );
}

function heatmapIntensity(count: number) {
  if (count < 0) return "bg-transparent";
  if (count === 0) return "bg-foreground/5";
  if (count === 1) return "bg-foreground/15";
  if (count <= 3) return "bg-foreground/30";
  if (count <= 6) return "bg-foreground/55";
  return "bg-foreground/85";
}
