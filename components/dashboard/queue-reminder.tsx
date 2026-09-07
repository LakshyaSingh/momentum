import Link from "next/link";
import { ArrowRight, Inbox } from "lucide-react";
import { GlassCard } from "@/components/glass/glass-card";
import { waitingLabel } from "@/lib/queued-jobs";

type QueueReminderProps = {
  count: number;
  oldestDays: number;
};

/**
 * Nudge toward the queue.
 *
 * Deliberately separate from the daily-goal ring: queued jobs are not progress,
 * and folding them into the goal would recreate the exact problem this feature
 * exists to fix. Age is the useful signal — a bare count stops registering.
 */
export function QueueReminder({ count, oldestDays }: QueueReminderProps) {
  if (count === 0) return null;

  return (
    <Link href="/applications?tab=queue" className="block">
      <GlassCard className="flex items-center gap-4 p-5 transition-colors hover:bg-foreground/[0.03]">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground/[0.06] text-foreground/70">
          <Inbox className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            {count} job{count === 1 ? "" : "s"} waiting to be applied to
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {oldestDays >= 1
              ? `Oldest: ${waitingLabel(oldestDays).toLowerCase()}`
              : "All added today"}
          </p>
        </div>
        <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
      </GlassCard>
    </Link>
  );
}
