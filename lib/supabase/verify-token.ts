import { createClient } from "@supabase/supabase-js";
import {
  env,
  isSupabaseConfigured,
  mcpResourceUrl,
  supabaseAuthServerUrl,
} from "@/lib/env";
import { mirrorSupabaseUser, type SessionUser } from "@/lib/auth";

/**
 * Validates a bearer access token issued by the Supabase OAuth 2.1 server for
 * the MCP resource server. Confirms the token via Supabase (`getUser`), checks
 * the issuer and — when present — the RFC 8707 resource binding, then mirrors
 * the user into our `users` table.
 *
 * v1 validates by calling Supabase (`getUser(token)`), which verifies the JWT
 * signature and expiry server-side. Local JWKS verification with `jose` is the
 * hardening follow-up noted in the MCP plan.
 */

type Claims = {
  iss?: string;
  sub?: string;
  aud?: string | string[];
  resource?: string;
  client_id?: string;
  email?: string;
  exp?: number;
};

function decodeJwtClaims(token: string): Claims | null {
  const parts = token.split(".");
  if (parts.length < 2 || !parts[1]) return null;
  try {
    const json = Buffer.from(
      parts[1].replace(/-/g, "+").replace(/_/g, "/"),
      "base64",
    ).toString("utf8");
    return JSON.parse(json) as Claims;
  } catch {
    return null;
  }
}

const stripSlash = (s: string) => s.replace(/\/$/, "");

/**
 * RFC 8707 audience binding. Supabase's default `aud` claim is "authenticated"
 * (not a resource URL), so we only *enforce* a match when the token actually
 * carries an https resource indicator. Once Supabase's OAuth beta finalizes its
 * resource-indicator claim this should be tightened to require it.
 */
function audienceMatches(claims: Claims): boolean {
  const canonical = stripSlash(mcpResourceUrl);
  const candidates: string[] = [];
  if (typeof claims.resource === "string") candidates.push(claims.resource);
  if (typeof claims.aud === "string") candidates.push(claims.aud);
  else if (Array.isArray(claims.aud)) candidates.push(...claims.aud);

  const resourceIndicators = candidates.filter((c) => /^https?:\/\//i.test(c));
  if (resourceIndicators.length === 0) return true;
  return resourceIndicators.some((c) => stripSlash(c) === canonical);
}

export type VerifiedToken = { user: SessionUser; clientId: string | null };

export async function verifyAccessToken(
  token: string,
): Promise<VerifiedToken | null> {
  if (!isSupabaseConfigured || !token) return null;

  const claims = decodeJwtClaims(token);

  // Reject tokens not issued by our Supabase auth server.
  if (
    claims?.iss &&
    supabaseAuthServerUrl &&
    stripSlash(claims.iss) !== stripSlash(supabaseAuthServerUrl)
  ) {
    return null;
  }
  // Reject tokens not intended for this resource (when the claim is present).
  if (claims && !audienceMatches(claims)) return null;

  const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;

  const authUser = data.user;
  const name =
    (authUser.user_metadata?.full_name as string | undefined) ??
    (authUser.user_metadata?.name as string | undefined) ??
    null;
  const image = (authUser.user_metadata?.avatar_url as string | undefined) ?? null;

  const user = await mirrorSupabaseUser({
    id: authUser.id,
    email: authUser.email,
    name,
    image,
  });

  return { user, clientId: claims?.client_id ?? null };
}
