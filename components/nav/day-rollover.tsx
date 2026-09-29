"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isoDateKeyInTimezone } from "@/lib/utils";

const CHECK_INTERVAL_MS = 60_000;

/**
 * Refetches the page when the calendar day changes in the user's timezone, so
 * "today" counters reset at midnight without a reload or a new application.
 *
 * Polls instead of scheduling one timer for midnight: timers pause while a
 * laptop sleeps, and a DST change moves midnight. The focus and visibility
 * checks catch the tab being reopened after the day has already turned.
 */
export function DayRollover({ timeZone }: { timeZone: string }) {
  const router = useRouter();

  useEffect(() => {
    const zone = timeZone || "UTC";
    let dayKey = isoDateKeyInTimezone(new Date(), zone);

    function check() {
      if (document.visibilityState === "hidden") return;
      const next = isoDateKeyInTimezone(new Date(), zone);
      if (next === dayKey) return;
      dayKey = next;
      router.refresh();
    }

    const interval = window.setInterval(check, CHECK_INTERVAL_MS);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, [timeZone, router]);

  return null;
}
