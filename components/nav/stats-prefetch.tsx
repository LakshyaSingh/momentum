"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { warmApplicationsNavigation } from "@/lib/applications-index-client";

/**
 * Prefetch dashboard and calendar data during idle time so navigations hit warm cache.
 */
export function StatsPrefetch() {
  const router = useRouter();

  useEffect(() => {
    function warm() {
      void fetch("/api/warm-stats", { cache: "no-store" });
      warmApplicationsNavigation(router);
    }

    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(warm, { timeout: 2500 });
      return () => window.cancelIdleCallback(id);
    }

    const timer = setTimeout(warm, 1200);
    return () => clearTimeout(timer);
  }, [router]);

  return null;
}
