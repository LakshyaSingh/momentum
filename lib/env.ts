/**
 * Centralised env access. We let the app boot without Supabase configured so
 * developers can explore the UI before wiring credentials, but server actions
 * that touch the DB will surface a friendly error.
 */

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  // Supabase renamed the anon key to "publishable key" — accept either.
  supabaseAnonKey:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    "",
  // The service-role key was renamed to "secret key" — accept either.
  serviceRoleKey:
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SECRET_KEY ??
    "",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  databaseUrl: process.env.DATABASE_URL ?? "",
};

export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);
export const isSupabaseAdminConfigured = Boolean(isSupabaseConfigured && env.serviceRoleKey);
export const isDatabaseConfigured = Boolean(env.databaseUrl);

/** "Demo mode" is on when Supabase isn't configured — auth is bypassed using a fixed demo user. */
export const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";
export const DEMO_USER_EMAIL = "demo@momentum.app";
