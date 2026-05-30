import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env, isSupabaseConfigured } from "@/lib/env";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/**
 * Server-side Supabase client. Reads cookies() from the current request.
 * Only safe to call from Server Components, Server Actions, or Route Handlers.
 */
export async function createSupabaseServerClient() {
  if (!isSupabaseConfigured) {
    return null;
  }
  const cookieStore = await cookies();
  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // The `setAll` method was called from a Server Component which can't
          // set cookies — middleware refreshes the session, so this is fine.
        }
      },
    },
  });
}
