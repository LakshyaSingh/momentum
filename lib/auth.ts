import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DEMO_USER_EMAIL, DEMO_USER_ID, isSupabaseConfigured } from "@/lib/env";

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  dailyGoal: number;
  timezone: string;
};

type AuthIdentity = {
  id: string;
  email: string | null;
  metadata: Record<string, unknown>;
};

/**
 * Establish who is making this request, without paying for a round-trip.
 *
 * `getUser()` calls the Auth server every single time — roughly 275ms measured
 * against this project, on every page render and every server action, on top of
 * the identical call middleware already makes. `getClaims()` answers the same
 * question by verifying the access token's signature locally with WebCrypto
 * against the project's JWKS public key, which is fetched once and cached.
 *
 * This is a real verification, not a decode: the token is rejected unless it is
 * signed by the project's key and unexpired. It is what Supabase recommends
 * over `getUser()` for projects on asymmetric signing keys, which this one is
 * (JWKS serves an ES256 key).
 *
 * Session refresh is unaffected. Middleware owns it, and it must — the cookie
 * jar is read-only in a Server Component, which is why `setAll` in
 * `lib/supabase/server.ts` silently discards writes.
 *
 * Falls back to `getUser()` if verification cannot be done locally: a project
 * moved back to a symmetric secret, a runtime without WebCrypto, or an
 * unreachable JWKS endpoint. Slower, but never wrong.
 */
async function resolveAuthIdentity(
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
): Promise<AuthIdentity | null> {
  try {
    const { data, error } = await supabase.auth.getClaims();

    if (!error) {
      const claims = data?.claims;
      // No claims and no error means there is genuinely no session.
      if (!claims?.sub) return null;
      return {
        id: claims.sub,
        email: typeof claims.email === "string" ? claims.email : null,
        metadata: (claims.user_metadata ?? {}) as Record<string, unknown>,
      };
    }
  } catch (err) {
    console.error("getClaims failed, falling back to getUser", err);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  return {
    id: user.id,
    email: user.email ?? null,
    metadata: (user.user_metadata ?? {}) as Record<string, unknown>,
  };
}

/**
 * Mirror a Supabase auth user into our domain `users` table (read-first; write
 * only when a mirrored field drifts) and return the `SessionUser`. Shared by
 * the cookie-session path (`getCurrentUser`) and the bearer-token path used by
 * the MCP resource server, so an OAuth-only user who has never opened the web
 * UI still gets a row on their first MCP call.
 */
export async function mirrorSupabaseUser(input: {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
}): Promise<SessionUser> {
  const email = input.email ?? `${input.id}@unknown.local`;
  const name = input.name ?? null;
  const image = input.image ?? null;

  const existing = await prisma.user.findUnique({ where: { id: input.id } });
  if (existing) {
    if (existing.email !== email || existing.name !== name || existing.image !== image) {
      const updated = await prisma.user.update({
        where: { id: input.id },
        data: { email, name, image },
      });
      return toSessionUser(updated);
    }
    return toSessionUser(existing);
  }

  const created = await prisma.user.create({
    data: { id: input.id, email, name, image },
  });
  return toSessionUser(created);
}

function toSessionUser(u: {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  dailyGoal: number;
  timezone: string;
}): SessionUser {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    image: u.image,
    dailyGoal: u.dailyGoal,
    timezone: u.timezone,
  };
}

/**
 * Resolve the current signed-in user, ensure a row exists in our `users` table,
 * and return it. If Supabase isn't configured we silently use the demo user so
 * the app remains explorable in greenfield mode.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  if (!isSupabaseConfigured) {
    // Demo fallback — useful for local exploration and Vercel preview without secrets.
    const demo = await prisma.user.upsert({
      where: { id: DEMO_USER_ID },
      update: {},
      create: {
        id: DEMO_USER_ID,
        email: DEMO_USER_EMAIL,
        name: "Demo Builder",
        timezone: "America/Los_Angeles",
      },
    });
    return {
      id: demo.id,
      email: demo.email,
      name: demo.name,
      image: demo.image,
      dailyGoal: demo.dailyGoal,
      timezone: demo.timezone,
    };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const identity = await resolveAuthIdentity(supabase);
  if (!identity) return null;

  // Mirror the Supabase auth user into our domain table (read-first; write only when needed).
  const name =
    (identity.metadata.full_name as string | undefined) ??
    (identity.metadata.name as string | undefined) ??
    null;
  const image = (identity.metadata.avatar_url as string | undefined) ?? null;

  return mirrorSupabaseUser({ id: identity.id, email: identity.email, name, image });
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  return user;
}
