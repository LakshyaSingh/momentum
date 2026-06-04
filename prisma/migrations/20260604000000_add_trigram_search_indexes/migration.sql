-- Trigram (pg_trgm) GIN indexes for fast substring search at any scale.
--
-- The applications search runs case-insensitive "contains" matches across
-- company / role / location / notes / recruiter (Prisma `contains` with
-- mode: "insensitive" => `column ILIKE '%term%'`). A leading-wildcard ILIKE
-- cannot use a normal B-tree index, so without these it is a sequential scan
-- that gets linearly slower as the table grows.
--
-- pg_trgm's GIN gin_trgm_ops indexes DO accelerate `ILIKE '%term%'`, keeping
-- search in the single-digit-millisecond range regardless of row count. The
-- existing OR-of-ILIKE query lets the planner bitmap-OR these per-column
-- indexes together.
--
-- Notes:
--   * CREATE INDEX (not CONCURRENTLY) because Prisma runs each migration in a
--     transaction; CONCURRENTLY is disallowed there. The brief lock is fine at
--     current table size.
--   * Trigram matching needs >=3 character terms to use the index; shorter
--     terms still work correctly, just without the index acceleration.
--   * userId scoping and pagination are unchanged and still applied by the
--     query builder; these indexes only speed up the text match.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "applications_company_trgm_idx"
  ON "applications" USING gin ("company" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "applications_role_trgm_idx"
  ON "applications" USING gin ("role" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "applications_location_trgm_idx"
  ON "applications" USING gin ("location" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "applications_notes_trgm_idx"
  ON "applications" USING gin ("notes" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "applications_recruiter_trgm_idx"
  ON "applications" USING gin ("recruiter" gin_trgm_ops);
