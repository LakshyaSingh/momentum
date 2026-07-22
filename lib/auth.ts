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

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Mirror the Supabase auth user into our domain table (read-first; write only when needed).
  const name =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    null;
  const image = (user.user_metadata?.avatar_url as string | undefined) ?? null;

  return mirrorSupabaseUser({ id: user.id, email: user.email, name, image });
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  return user;
}
