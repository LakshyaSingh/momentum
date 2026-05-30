import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env, isSupabaseAdminConfigured } from "@/lib/env";

/** Server-only admin client for auth user management (requires service/secret key). */
export function createSupabaseAdminClient(): SupabaseClient | null {
  if (!isSupabaseAdminConfigured) return null;
  return createClient(env.supabaseUrl, env.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
