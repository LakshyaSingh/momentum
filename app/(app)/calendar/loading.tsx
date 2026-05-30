export default function CalendarLoading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading consistency page">
      <div className="space-y-2 animate-pulse">
        <div className="h-9 w-48 rounded-2xl bg-muted/40" />
        <div className="h-4 w-64 rounded-full bg-muted/30" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 animate-pulse">
        <div className="h-24 rounded-3xl bg-muted/35" />
        <div className="h-24 rounded-3xl bg-muted/35" />
        <div className="h-24 rounded-3xl bg-muted/35" />
      </div>

      <div className="h-44 animate-pulse rounded-3xl bg-muted/30" />
    </div>
  );
}
