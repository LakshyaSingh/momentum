import type { CheerioAPI } from "cheerio";
import type { LayerSource, RawLayer } from "@/lib/job-link/internal";

/**
 * Function shape for an ATS-specific adapter. Each adapter receives:
 *   - the parsed cheerio root for the fetched HTML
 *   - the raw HTML (some adapters need to grep for inline JSON blobs)
 *   - the parsed URL
 *
 * Adapters return a `RawLayer` if they recognize the page (even if some
 * fields are missing); otherwise `null`. The orchestrator only runs the
 * adapter whose `match()` returns true for the given URL.
 */
export type AtsAdapter = {
  source: LayerSource;
  /** Returns true when this adapter should run for the given URL or host. */
  match(url: URL): boolean;
  extract(input: { $: CheerioAPI; html: string; url: URL }): RawLayer | null;
};
