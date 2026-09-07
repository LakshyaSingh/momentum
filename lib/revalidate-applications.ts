import { revalidatePath, revalidateTag } from "next/cache";
import { applicationStatsTag } from "@/lib/streak";

/**
 * Revalidate every surface derived from a user's applications.
 *
 * Shared by the application actions and by `applyQueuedJob`, which creates a
 * real Application and therefore has to invalidate exactly the same set. Any
 * new route that renders derived application data belongs in this list.
 */
export function revalidateAllApplicationSurfaces(userId: string) {
  try {
    revalidatePath("/dashboard");
    revalidatePath("/applications");
    revalidatePath("/analytics");
    revalidatePath("/calendar");
    revalidateTag(applicationStatsTag(userId));
  } catch (err) {
    // revalidate* require the Next request store. The MCP resource server calls
    // the application service outside one, and a stray call there must never
    // fail an otherwise-successful write.
    console.error("revalidateAllApplicationSurfaces skipped", err);
  }
}

/**
 * Revalidate the surfaces that show the queue.
 *
 * Deliberately narrower than the above: it must NOT touch
 * `applicationStatsTag`, because queued jobs contribute nothing to the streak,
 * daily goal, heatmap, funnel, or analytics. Busting that tag on a queue
 * mutation would throw away correct cached metrics for no reason.
 */
export function revalidateQueueSurfaces() {
  try {
    revalidatePath("/applications");
    revalidatePath("/dashboard");
  } catch (err) {
    console.error("revalidateQueueSurfaces skipped", err);
  }
}
