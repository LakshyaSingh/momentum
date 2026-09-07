/**
 * Route-shaped fallback for /applications.
 *
 * Without this the shared `app/(app)/loading.tsx` runs, which is built around
 * the dashboard's goal ring and stat grid — the wrong silhouette, and with no
 * tab strip, so arriving from the dashboard's queue card showed a layout that
 * then rearranged itself. This is also what `<Link>` prefetches for a
 * force-dynamic route, so it is what makes the navigation feel immediate while
 * the server does its work.
 */
export default function ApplicationsLoading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading applications">
      <header className="flex flex-wrap items-end justify-between gap-4 animate-pulse">
        <div className="space-y-3">
          <div className="h-9 w-52 rounded-2xl bg-muted/40" />
          <div className="h-4 w-64 max-w-[70%] rounded-full bg-muted/30" />
        </div>
        <div className="h-9 w-32 rounded-full bg-muted/35" />
      </header>

      <div className="space-y-4">
        {/* Tab strip — same pill geometry as the real SegmentedControl. */}
        <div className="inline-flex gap-1 rounded-full bg-muted/30 p-1 animate-pulse">
          <div className="h-8 w-24 rounded-full bg-muted/45" />
          <div className="h-8 w-24 rounded-full bg-muted/25" />
        </div>

        <div className="h-11 w-full rounded-2xl bg-muted/25 animate-pulse" />

        <div className="overflow-hidden rounded-3xl bg-muted/20">
          <div className="divide-y divide-border/40">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                <div className="size-9 shrink-0 rounded-full bg-muted/40" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-3.5 w-48 max-w-[60%] rounded-full bg-muted/40" />
                  <div className="h-3 w-64 max-w-[45%] rounded-full bg-muted/25" />
                </div>
                <div className="hidden h-3 w-16 rounded-full bg-muted/25 sm:block" />
                <div className="h-8 w-24 rounded-full bg-muted/30" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
