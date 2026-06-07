import { JobParseError } from "@/lib/job-link/internal";
import { assertSafeJobUrl } from "@/lib/job-link/is-safe-url";

const FETCH_TIMEOUT_MS = 12_000;
const MAX_BYTES = 2 * 1024 * 1024;

const CAPTCHA_MARKERS = [
  "cf-browser-verification",
  "challenge-platform",
  "/recaptcha/",
  "hcaptcha",
  "cf-challenge",
  "px-captcha",
  "datadome",
  "perimeterx",
  "are you human",
  "verify you are a human",
];

const EXPIRED_MARKERS = [
  "this job is no longer accepting applications",
  "this position is no longer available",
  "the job you are looking for is no longer",
  "this posting has been closed",
  "this posting is no longer available",
  "job posting has expired",
  "this requisition is closed",
];

function statusToError(status: number, url: string): JobParseError {
  if (status === 401 || status === 403) {
    return new JobParseError(
      "blocked",
      "That site blocks automated reading. Enter the details manually.",
      status,
    );
  }
  if (status === 404) {
    return new JobParseError("not_found", "That job posting could not be found.", status);
  }
  if (status === 410) {
    return new JobParseError("expired", "That job posting is no longer available.", status);
  }
  if (status === 429) {
    return new JobParseError(
      "rate_limited",
      "We're being rate-limited by that site. Try again in a few minutes.",
      status,
    );
  }
  return new JobParseError(
    "network",
    `Could not open that page (${status}).`,
    status,
  );
}

export async function fetchJobPageHtml(url: string): Promise<string> {
  const parsed = assertSafeJobUrl(url);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(parsed.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        // Mimic a real Chrome top-level navigation as closely as a plain fetch
        // allows. This slips past the *weakest* bot heuristics (UA/header
        // sniffing); it does NOT defeat real challenge platforms (Cloudflare,
        // DataDome, PerimeterX) — those need a browser, which is out of scope.
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "sec-ch-ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"macOS"',
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) {
      throw statusToError(response.status, url);
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      throw new JobParseError(
        "wrong_content_type",
        "That link does not look like a job posting page.",
      );
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new JobParseError("network", "Could not read that page.");
    }

    const chunks: Uint8Array[] = [];
    let total = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      total += value.byteLength;
      if (total > MAX_BYTES) {
        throw new JobParseError("too_large", "That page is too large to parse.");
      }

      chunks.push(value);
    }

    const html = new TextDecoder("utf-8", { fatal: false }).decode(
      chunks.length === 1 ? chunks[0]! : concatUint8(chunks),
    );

    // Detect bot challenges that return 200 but a captcha body.
    if (looksLikeCaptcha(html)) {
      throw new JobParseError(
        "captcha",
        "That site is showing a bot challenge instead of the posting.",
      );
    }
    if (looksExpired(html)) {
      throw new JobParseError("expired", "That job posting is no longer available.");
    }

    return html;
  } catch (error) {
    if (error instanceof JobParseError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new JobParseError("timeout", "Timed out while loading that page.");
    }
    throw new JobParseError(
      "network",
      error instanceof Error ? error.message : "Could not read that page.",
    );
  } finally {
    clearTimeout(timeout);
  }
}

function looksLikeCaptcha(html: string): boolean {
  if (html.length > 200_000) return false; // captcha pages are tiny
  const lower = html.toLowerCase();
  return CAPTCHA_MARKERS.some((marker) => lower.includes(marker));
}

function looksExpired(html: string): boolean {
  // Only check a slice — full body match is too slow on multi-MB HTML.
  const slice = html.slice(0, 12_000).toLowerCase();
  return EXPIRED_MARKERS.some((marker) => slice.includes(marker));
}

function concatUint8(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const merged = new Uint8Array(total);
  let offset = 0;

  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return merged;
}
