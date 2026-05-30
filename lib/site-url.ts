/**
 * Resolve the public site URL for OAuth / email confirmation redirects.
 *
 * On Vercel, `NEXT_PUBLIC_SITE_URL` is often copied from `.env.local` as
 * localhost. We prefer a real production URL from VERCEL_URL or request
 * headers in that case.
 */
export function resolveSiteUrl(forwarded?: {
  host?: string | null;
  proto?: string | null;
}): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");

  if (process.env.VERCEL === "1") {
    if (configured && !configured.includes("localhost")) {
      return configured;
    }
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}`;
    }
  }

  if (forwarded?.host) {
    const proto =
      forwarded.proto ??
      (process.env.VERCEL === "1" || forwarded.host.includes(".vercel.app")
        ? "https"
        : "http");
    return `${proto}://${forwarded.host}`;
  }

  if (configured) return configured;
  return "http://localhost:3000";
}
