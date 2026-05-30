const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "metadata.google.internal",
]);

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split(".").map((part) => Number.parseInt(part, 10));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return false;

  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 0) return true;
  return false;
}

export function assertSafeJobUrl(raw: string): URL {
  let parsed: URL;

  try {
    parsed = new URL(raw.trim());
  } catch {
    throw new Error("Enter a valid job posting URL.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http(s) job links are supported.");
  }

  if (parsed.username || parsed.password) {
    throw new Error("Job links with embedded credentials are not allowed.");
  }

  const hostname = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith(".local")) {
    throw new Error("That URL is not allowed.");
  }

  if (isPrivateIpv4(hostname)) {
    throw new Error("That URL is not allowed.");
  }

  return parsed;
}
