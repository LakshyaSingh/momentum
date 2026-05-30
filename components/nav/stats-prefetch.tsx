"use client";

import { useEffect } from "react";

/**
 * Prefetch dashboard and calendar data during idle time so navigations hit warm cache.
 */
export function StatsPrefetch() {
  useEffect(() => {
    function warm() {
      void fetch("/api/warm-stats", { cache: "no-store" });
    }

    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(warm, { timeout: 2500 });
      return () => window.cancelIdleCallback(id);
    }

    const timer = setTimeout(warm, 1200);
    return () => clearTimeout(timer);
  }, []);

  return null;
}
