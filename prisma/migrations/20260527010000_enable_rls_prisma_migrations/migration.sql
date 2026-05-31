-- Enable RLS on _prisma_migrations.
--
-- _prisma_migrations is created and owned by Prisma itself (not declared in
-- schema.prisma as a model), so the previous deny-all migration didn't touch
-- it. The Supabase table editor flagged it as "UNRESTRICTED" — meaning the
-- anon/publishable key could read it via PostgREST.
--
-- The table contains no user data, but it does leak the migration history
-- (table names, timestamps, checksums) which is reconnaissance value an
-- attacker shouldn't get for free.
--
-- Same deny-all pattern: enable + force RLS, no policies. Prisma's privileged
-- DATABASE_URL connection has BYPASSRLS, so future migrations continue to
-- read/write this table normally.

ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" FORCE  ROW LEVEL SECURITY;
