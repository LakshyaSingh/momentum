-- Enable Row-Level Security on every public table with NO policies attached.
--
-- Why: Supabase auto-exposes the `public` schema via PostgREST. With default
-- grants, anyone holding NEXT_PUBLIC_SUPABASE_ANON_KEY (i.e. every visitor)
-- can read every row from these tables via
--   GET https://<ref>.supabase.co/rest/v1/<table>?select=*
-- regardless of how the Next.js app accesses the database. Our app uses
-- Prisma with a privileged DATABASE_URL connection (BYPASSRLS), so enabling
-- RLS does not affect server actions or API routes. It only closes the
-- PostgREST hole for the anon and authenticated roles.
--
-- No policies are defined: with RLS on and no policies, the default is
-- deny-all for any role that does not have BYPASSRLS. That is exactly the
-- behavior we want — the REST API returns an empty array (or 401) for the
-- anon key while Prisma queries continue unchanged.
--
-- Verify after applying:
--
--   1. Anon REST is closed (expect [] or 401):
--      curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/applications?select=*" \
--           -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"
--
--   2. Prisma still works (run any server action; check that signed-in
--      users still see their applications). If queries fail with
--      "permission denied for table …", the DATABASE_URL role does NOT
--      have BYPASSRLS. In that case either:
--        (a) grant BYPASSRLS to the role (Supabase: usually already set on
--            the `postgres` role; check with
--              SELECT rolname, rolbypassrls FROM pg_roles
--               WHERE rolname = current_user;
--            after connecting as the Prisma role), OR
--        (b) define explicit policies that allow your Prisma role.

ALTER TABLE "users"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "applications"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "status_events"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tags"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "application_tags" ENABLE ROW LEVEL SECURITY;

-- Belt-and-suspenders: also FORCE row security so that even a future table
-- owner cannot accidentally bypass policies via implicit ownership rules.
-- (Owners normally bypass RLS; FORCE removes that exception.)
ALTER TABLE "users"            FORCE ROW LEVEL SECURITY;
ALTER TABLE "applications"     FORCE ROW LEVEL SECURITY;
ALTER TABLE "status_events"    FORCE ROW LEVEL SECURITY;
ALTER TABLE "tags"             FORCE ROW LEVEL SECURITY;
ALTER TABLE "application_tags" FORCE ROW LEVEL SECURITY;
