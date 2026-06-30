"use client";

import type { ApplicationRow } from "@/components/applications/data-table";

export type ApplicationsIndexPayload = {
  rows: ApplicationRow[];
  skipped?: boolean;
  total?: number;
};

type PrefetchRouter = {
  prefetch: (href: string) => void;
};

let cachedIndex: ApplicationsIndexPayload | null = null;
let indexRequest: Promise<ApplicationsIndexPayload> | null = null;

export function readWarmedApplicationsIndex(): ApplicationsIndexPayload | null {
  return cachedIndex;
}

export function getApplicationsIndexWarmPromise(): Promise<ApplicationsIndexPayload> | null {
  return indexRequest;
}

export function clearApplicationsIndexWarmCache() {
  cachedIndex = null;
  indexRequest = null;
}

export function warmApplicationsIndex(
  options: { force?: boolean } = {},
): Promise<ApplicationsIndexPayload> {
  if (!options.force && cachedIndex) return Promise.resolve(cachedIndex);
  if (indexRequest) return indexRequest;

  indexRequest = fetch("/api/applications/search-index", { cache: "no-store" })
    .then((res) => {
      if (!res.ok) throw new Error("Failed to warm applications index");
      return res.json() as Promise<ApplicationsIndexPayload>;
    })
    .then((data) => {
      cachedIndex = data;
      return data;
    })
    .finally(() => {
      indexRequest = null;
    });

  return indexRequest;
}

export function warmApplicationsNavigation(
  router?: PrefetchRouter,
  options: { forceIndex?: boolean } = {},
) {
  router?.prefetch("/applications");
  void warmApplicationsIndex({ force: options.forceIndex }).catch(() => {
    /* non-fatal: the Applications page can fetch its own data on navigation */
  });
}
