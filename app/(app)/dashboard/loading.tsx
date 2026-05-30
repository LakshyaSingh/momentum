export default function DashboardLoading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading dashboard">
      <div className="space-y-2 animate-pulse">
        <div className="h-4 w-28 rounded-full bg-muted/50" />
        <div className="h-10 w-56 max-w-[70%] rounded-2xl bg-muted/40" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 animate-pulse">
        <div className="h-48 rounded-3xl bg-muted/35 md:col-span-1" />
        <div className="grid gap-4 md:col-span-2">
          <div className="h-28 rounded-3xl bg-muted/35" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-24 rounded-3xl bg-muted/30" />
            <div className="h-24 rounded-3xl bg-muted/30" />
          </div>
        </div>
      </div>
    </div>
  );
}
