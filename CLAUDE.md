# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Momentum** (`package.json` name) is a habit-driven job application tracker built on Next.js (App Router, RSC + Server Actions), Supabase (Auth + Postgres), Prisma, and Tailwind/shadcn. The README has a full feature tour and Supabase setup walkthrough.

> Version note: the README markets this as "Next.js 16", but the pinned dependency is **Next.js 15.1.x** (`next@^15.1.12`), and `middleware.ts` / `next lint` are still the v15 conventions. Trust the installed version, not the marketing copy.

## Commands

```bash
npm run dev          # Next.js dev server (http://localhost:3000)
npm run build        # prisma generate && next build
npm run lint         # ESLint (eslint-config-next)
npm run db:migrate   # prisma migrate dev   (loads .env.local via dotenv-cli)
npm run db:push      # prisma db push        (schema sync without a migration)
npm run db:deploy    # prisma migrate deploy (CI/prod)
npm run db:seed      # seed ~120 demo applications for demo@momentum.app
npm run db:studio    # Prisma Studio
```

All `db:*` scripts load env from `.env.local` via `dotenv-cli` — they will not see `.env` or shell env. After changing `prisma/schema.prisma`, run `npm run db:migrate` (regenerates the client too). Migrations are **not** run on deploy; run `db:deploy` manually against Supabase when the schema changes.

### Tests

There is no test runner. Tests are standalone `tsx` scripts that assert and exit non-zero on failure:

```bash
npm run test:job-parse      # lib/job-link/extract-fields.test.ts
npm run test:company-logo   # lib/company-logo.test.ts
npm run test:company-lookup # lib/company-lookup.test.ts
# run any single test file directly:
npx tsx lib/<file>.test.ts
```

## Architecture

### Auth & the demo-mode fallback

`lib/env.ts` exposes `isSupabaseConfigured`. When Supabase env vars are absent, the app runs in **demo mode**: `getCurrentUser` (`lib/auth.ts`) returns a fixed demo user (`DEMO_USER_ID`) instead of reading a session. A real `DATABASE_URL` is still required even in demo mode — there is no in-memory store.

`getCurrentUser` is wrapped in React `cache()` and **mirrors** the Supabase auth user into our own `users` table (upsert-on-first-sign-in, write only when fields drift). Server code should call `requireUser()` (redirects to `/` if unauthenticated) — never read Supabase auth directly. `middleware.ts` only refreshes the Supabase session cookie via `lib/supabase/middleware.ts`; it does not gate routes.

Supabase clients are split by context: `lib/supabase/server.ts` (RSC/actions), `client.ts` (browser), `admin.ts` (service-role), `middleware.ts` (cookie refresh).

### Data model (`prisma/schema.prisma`)

`User → Application → StatusEvent`, plus `Tag`/`ApplicationTag` join. `User.id` equals the Supabase `auth.users.id`. Each status transition writes a `StatusEvent` row — this drives the funnel chart and the application timeline; keep it in sync when mutating `Application.status`. Tables are explicitly `@@map`'d to snake_case.

### Mutations: Server Actions + cache invalidation

Writes live in `app/actions/*.ts` (`"use server"`). The canonical pattern (see `app/actions/applications.ts`) after any mutation is `revalidateAll(userId)`, which calls `revalidatePath` for `/dashboard`, `/applications`, `/analytics`, `/calendar` **and** `revalidateTag(applicationStatsTag(userId))`. Streak/stats reads are wrapped in `unstable_cache` keyed by that tag (`lib/streak.ts`, 300s TTL), so forgetting the `revalidateTag` leaves stale streak/dashboard data.

`createApplication` returns a `motivation` payload (a quote seed) and `milestone` so the client can fire the motivational quote overlay / streak celebration. Quotes live in `content/jobs-quotes.ts` (motivational lines from many authors); the overlay uses a gradient backdrop — there are no portrait images (removed for licensing). Milestones are `[3, 7, 14, 30, 100]`.

### MCP server (remote, per-user OAuth)

`app/api/[transport]/route.ts` is a remote **MCP resource server** (Streamable HTTP via `mcp-handler`,
mounted at `/api/mcp` with `basePath: "/api"`, SSE disabled). It lets external agents create/update
applications and query stats. Auth is **OAuth 2.1**: this route is only the *resource server* —
**Supabase's OAuth 2.1 server is the authorization server** (DCR + PKCE). `withMcpAuth` validates the
bearer token via `lib/supabase/verify-token.ts` (`verifyAccessToken` → Supabase `getUser(token)` +
issuer/audience checks + `mirrorSupabaseUser`), and puts `{ userId, timezone }` on `authInfo.extra`;
tool handlers read `extra.authInfo.extra.userId`. Protected-resource metadata (RFC 9728) is served at
`app/.well-known/oauth-protected-resource/route.ts`; the consent screen is `app/(auth)/oauth/authorize`
(uses `supabase.auth.oauth.{getAuthorizationDetails,approveAuthorization,denyAuthorization}`). Both
`/api/mcp` and `/.well-known` are excluded from the cookie-refresh `middleware.ts` matcher.

Tools wrap `lib/applications/service.ts` — `userId`-parameterized functions (create/update/transition/
delete/list/get + `getSearchSummaryForUser`) that are the **shared core** also called by the web
Server Actions in `app/actions/applications.ts` (thin `requireUser()` wrappers). Put new
application mutation/read logic in the service, not the actions, so both entry points stay in sync.
`mcpResourceUrl` / `supabaseAuthServerUrl` are derived in `lib/env.ts`.

### Client-side prefetch / cache warming

Two GET routes exist purely to warm caches for snappy navigation, kicked off from `components/nav/stats-prefetch.tsx` during browser idle time:
- `GET /api/warm-stats` primes the `unstable_cache`-backed dashboard + calendar reads (`getDashboardSnapshot`, `getHeatmapApplications`).
- `GET /api/applications/search-index` returns the full applications list for a client-held search index, capped at `APPLICATIONS_CLIENT_INDEX_MAX` (5000 rows in `lib/applications-list.ts`); above the cap it returns `{ skipped: true }` and the Applications page fetches on navigation. The in-memory client cache lives in `lib/applications-index-client.ts` (`warmApplicationsIndex` / `readWarmedApplicationsIndex`); mutations re-warm it (force refetch), so clear/re-warm it when changing how rows are shaped.

### Streak engine (`lib/streak.ts`)

Streaks are computed in the **user's timezone** (not UTC) by walking back day-by-day from "today" over the set of dates that have ≥1 application. Date-key helpers live in `lib/utils.ts` (`isoDateKeyInTimezone`, `lastNDaysInTimezone`). Timezone comes from `User.timezone` and is synced client→server via `components/settings/timezone-sync.tsx`.

### Job-link parsing (`lib/job-link/`)

`POST /api/jobs/parse` takes a job URL and extracts company/role/location/salary. Flow: `assertSafeJobUrl` (SSRF guard in `is-safe-url.ts`, blocks private/local IPs) → `parseJobLink` (`extract-fields.ts`). Parsing builds **layered extractors** (JSON-LD, microdata, Open Graph, meta, DOM, URL heuristics, text patterns) and merges them by confidence score (`scoring.ts`) rather than priority order. ATS-specific adapters live in `adapters/` (greenhouse, lever, ashby, workday, rippling, linkedin, etc.); internal `ats:<platform>` sources are collapsed to public source labels in `extract-fields.ts`. This is the most-tested subsystem — extend adapters/validators alongside `extract-fields.test.ts`.

### Company logos (`lib/company-logo.ts`, `lib/company-lookup.ts`)

`resolveCompanyDomainCandidates` derives a logo domain from company name + job link; persisted domains are stored on `Application.companyDomain` and trusted on later reads. `/api/company-logo` serves the logo. `next.config.ts` only allowlists `*.supabase.co` and `images.unsplash.com` for `next/image`.

### Frontend conventions

- Route groups: `(auth)` (sign-in/up, password flows), `(app)` (protected glass shell, layout calls `requireUser()`), and the marketing `app/page.tsx`.
- Design system: "liquid glass" primitives in `components/glass/`, floating nav in `components/nav/`. Respect `prefers-reduced-motion` (existing animations do).
- Client state: Zustand (`stores/motivation-store.ts`) holds the motivation overlay queue + recent-quote/image ring buffers. Server state flows through Server Actions + revalidation, not a client cache.
- Forms: React Hook Form + Zod. Schemas live in `lib/validators.ts` and are re-parsed inside the server action — validate on both sides.
- Import: Excel/CSV via SheetJS + PapaParse (`lib/excel.ts`, `components/import/`), transactional bulk insert in `app/actions/import.ts`. Server Action body limit is raised to 10mb in `next.config.ts`.
- UI primitives in `components/ui/` are shadcn — manage via `components.json`, don't hand-edit generated primitives unless intentional.

### Notes

- The README anticipates a Next.js 16 migration where `middleware.ts` becomes `proxy.ts`; on the current 15.1.x it's still `middleware.ts`.
- `lib/prisma.ts` uses a global singleton to avoid exhausting connections in dev.
