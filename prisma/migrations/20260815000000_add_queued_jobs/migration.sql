-- Queued jobs — the "found it, haven't applied yet" list.
--
-- Why a separate table rather than another ApplicationStatus value:
-- every metric in the app reads the `applications` table with no status
-- filter — the daily-count SQL in lib/application-stats.ts (which drives the
-- streak, daily goal, heatmap and week sparkline), buildFunnel, and
-- buildProductivity all count rows unconditionally. A queued job living in
-- `applications` would therefore inflate the streak and deflate every funnel
-- conversion rate, and each new metric added later would have to remember to
-- exclude it. A separate table makes that structurally impossible.
--
-- Rows move into `applications` via the applyQueuedJob server action, which
-- creates the Application (dated the day you actually applied) plus its
-- initial StatusEvent and deletes the queue row in one transaction.
--
-- Notes:
--   * The FK is ON DELETE CASCADE because deleteAccount (app/actions/user.ts)
--     deletes only the `users` row and relies entirely on cascade for children.
--     Without it, account deletion fails with a foreign-key violation.
--   * `company` and `role` are nullable on purpose: capture stores a pasted
--     link immediately and fills those in afterwards from the page parse.
--   * No trigram indexes here. The queue is a working list of tens of rows,
--     not thousands, so the sequential scan is cheaper than the index.

-- CreateTable
CREATE TABLE "queued_jobs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "company" TEXT,
    "companyDomain" TEXT,
    "role" TEXT,
    "location" TEXT,
    "jobLink" TEXT NOT NULL,
    "salary" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "queued_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "queued_jobs_userId_createdAt_idx" ON "queued_jobs"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "queued_jobs" ADD CONSTRAINT "queued_jobs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Row-Level Security — deny-all, matching 20260527000000_enable_rls_deny_all.
--
-- That migration enumerates tables explicitly by name, so a new table is NOT
-- covered by it. Without the two statements below, `queued_jobs` is exposed
-- through Supabase's PostgREST endpoint to anyone holding the publishable /
-- anon key:
--   GET https://<ref>.supabase.co/rest/v1/queued_jobs?select=*
--
-- No policies are attached. RLS on with zero policies is deny-all for every
-- role without BYPASSRLS; the Prisma DATABASE_URL role has BYPASSRLS, so app
-- queries are unaffected. FORCE additionally removes the table-owner bypass.
--
-- Verify after applying (expect [] or 401, never rows):
--   curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/queued_jobs?select=*" \
--        -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"
ALTER TABLE "queued_jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "queued_jobs" FORCE  ROW LEVEL SECURITY;
