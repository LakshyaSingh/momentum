# Momentum

A premium, habit-driven job application tracker. Apple-inspired liquid-glass UI, a motivational quote overlay on every new application, streak heatmap, and analytics, built on Next.js 16, Supabase, Prisma, and Tailwind.

---

## Highlights

- **Dashboard**: animated streak ring, daily-goal progress, week sparkline, recent applications, time-of-day greeting.
- **Applications**: filterable, sortable data table with rich create/edit sheet (RHF + Zod), status pills, optimistic updates, status timeline detail page.
- **Motivation overlay**: every new application triggers a cinematic full-screen overlay (curated motivational quotes from many voices, each verified against a primary source, over a gradient backdrop, Ken Burns, parallax). Streak milestones at 3 / 7 / 14 / 30 / 100 fire confetti celebrations.
- **Analytics**: segmented time range, gradient area chart, top companies, custom SVG funnel, productivity grid.
- **Calendar**: 53×7 GitHub-style heatmap with click-to-popover.
- **Excel/CSV import**: drag-and-drop, smart column mapping, per-row Zod validation, transactional bulk insert.
- **Settings**: daily goal slider, timezone, theme toggle, CSV export, danger-zone destructive actions.
- **Liquid glass design system**: `backdrop-blur` glass primitives, ambient mesh background, floating nav, layered translucency, `prefers-reduced-motion` respected throughout.

## Stack

| Layer        | Choice                                                    |
| ------------ | --------------------------------------------------------- |
| Framework    | Next.js 16 (App Router, Server Actions, RSC by default)   |
| Language     | TypeScript                                                |
| Styling      | Tailwind CSS, shadcn/ui (Radix primitives), Geist fonts   |
| Animation    | Framer Motion                                             |
| Charts       | Recharts + custom SVG funnel/heatmap                      |
| Auth + DB    | Supabase Auth (email + password), Supabase Postgres, Prisma |
| Forms        | React Hook Form + Zod                                     |
| Client state | Zustand (motivation queue, recent ring buffers)           |
| Import       | SheetJS (`xlsx`) + PapaParse                              |
| Deploy       | Vercel (Fluid Compute defaults)                           |

## Quick start

```bash
git clone <this-repo>
cd "Job Tracker"
npm install
cp .env.example .env.local
# fill in DATABASE_URL, DIRECT_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
npx prisma migrate dev          # creates schema in your Supabase Postgres
npm run db:seed                 # ~120 demo applications for demo@momentum.app
npm run dev                     # http://localhost:3000
```

## Supabase setup (5 minutes)

1. **Create a project** at [supabase.com](https://supabase.com). Pick a strong DB password.
2. **Database connection strings**: Settings → Database → "Connection string":
   - `DATABASE_URL` → "Transaction pooler" string (port `6543`, append `?pgbouncer=true&connection_limit=1` if missing).
   - `DIRECT_URL` → "Session pooler" or direct connection (port `5432`). Used only by `prisma migrate`.
3. **Auth keys**: Settings → API:
   - `NEXT_PUBLIC_SUPABASE_URL` → Project URL.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → `anon` `public` key.
   - `SUPABASE_SERVICE_ROLE_KEY` → `service_role` key (server-only, never expose).
4. **Auth URLs** (Authentication → URL Configuration):
   - **Site URL**: `http://localhost:3000` for dev; your live Vercel URL for production (e.g. `https://your-app.vercel.app`).
   - **Redirect URLs** (add all of these):
     - `http://localhost:3000/api/auth/callback`
     - `http://localhost:3000/api/auth/recovery`
     - `https://your-app.vercel.app/api/auth/callback`
     - `https://your-app.vercel.app/api/auth/recovery`
     - `https://*.vercel.app/api/auth/callback` (optional, for preview deploys)
   - Without these, email verification links will point at localhost and auth will break in production.
   - **Reset password email (recommended)**: Authentication → Email Templates → **Reset password**. Use a link that includes the token hash so mail apps work without PKCE cookies:
     ```html
     <h2>Reset password</h2>
     <p><a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery">Reset your password</a></p>
     ```
   - **Email template (recommended)**: Authentication → Email Templates → **Confirm signup**. Replace the link body with:
     ```html
     <h2>Confirm your signup</h2>
     <p><a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=signup">Confirm your email</a></p>
     ```
     This logs users in even when they open the link from a mail app (PKCE cookies are not required).
5. Run `npx prisma migrate dev`. Prisma will provision the `User`, `Application`, `StatusEvent`, `Tag`, `ApplicationTag` tables in your Supabase database.
6. Run `npm run db:seed`. Populates demo data so the dashboard isn't empty on first run.

> **Demo mode**: If `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are missing the app falls back to a single hard-coded demo user, but **Prisma still needs a real `DATABASE_URL`**. There is no in-memory store. The simplest path is always to wire up Supabase first.

## Scripts

```bash
npm run dev          # Next.js dev server (Turbopack)
npm run build        # Production build
npm run start        # Run the production build locally
npm run lint         # ESLint
npm run db:migrate   # prisma migrate dev
npm run db:deploy    # prisma migrate deploy (CI/prod)
npm run db:seed      # tsx prisma/seed.ts
npm run db:studio    # Prisma Studio
```

## Motivation quotes & imagery

The motivation overlay and top quote bar render quotes over a **gradient backdrop** — no portrait images ship with the project, to avoid copyright concerns. Quotes live in [`content/jobs-quotes.ts`](content/jobs-quotes.ts) (short motivational lines from a range of authors, each carrying a documented `source`); edit that array to change them — keep new entries verifiable against a primary source. If you want to add licensed photos, reintroduce an image manifest and wire it into `components/motivation/jobs-overlay.tsx` and `jobs-quote-bar.tsx`; license any photos yourself.

## Project layout

```
app/
  (marketing)/page.tsx           # public landing
  (auth)/sign-in, sign-up        # Supabase email + password
  (app)/                         # protected glass shell
    dashboard, applications, applications/[id]
    analytics, calendar, import, settings
  api/auth/callback/route.ts
  actions/                       # server actions (applications, auth, import, user)
components/
  glass/                         # GlassCard, GlassPanel, AmbientBackground, ThemeToggle, UserMenu
  nav/FloatingNav.tsx            # top-pill desktop / bottom-pill mobile
  applications/                  # DataTable, FilterBar, ApplicationSheet, QuickAdd, StatusPill
  dashboard/                     # ProgressRing, StreakDisplay, DailyGoal, WeekSparkline
  analytics/                     # ApplicationsOverTime, TopCompanies, FunnelChart, ProductivityCards
  calendar/ContributionHeatmap.tsx
  motivation/                    # JobsOverlay, StreakCelebration, MotivationStage
  import/                        # UploadDropzone, ColumnMapper, ImportPreview
  settings/                      # SettingsForm, ExportButton, DangerZone
  ui/                            # shadcn primitives
content/jobs-quotes.ts           # 40+ curated quotes
lib/
  prisma.ts, supabase/, auth.ts, env.ts
  streak.ts, analytics.ts, excel.ts, validators.ts, utils.ts
  hooks/use-media-query.ts
stores/motivation-store.ts       # zustand: queue + recent quote ring buffer
prisma/{schema.prisma, seed.ts}
middleware.ts                    # Supabase session refresh (Next.js 16 → rename to proxy.ts when fully migrated)
```

## Deploy to Vercel

```bash
npx vercel link            # one-time: connect to a Vercel project
npx vercel env pull        # pull env vars locally
npx vercel deploy --prod   # ship it
```

Set `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `NEXT_PUBLIC_SITE_URL` in the Vercel dashboard (Production + Preview + Development). Add your Vercel URL to Supabase Authentication → URL Configuration → Redirect URLs.

`vercel build` runs `prisma generate` automatically via the `postinstall` script. Migrations are not run on deploy. Run `npx prisma migrate deploy` against your Supabase DB whenever the schema changes.

## Connect an AI agent (MCP)

Momentum ships a remote **MCP server** so AI agents (Claude, Cursor, Codex, …) can add
applications, update statuses, and answer questions about your search — e.g. an agent watching
your inbox can auto-add a job when a "thanks for applying" email arrives and flip an application to
`REJECTED` when a rejection lands. The polling cadence is the agent's job; Momentum never reads your
email.

- **Endpoint:** `https://your-app.vercel.app/api/mcp` (Streamable HTTP). Shown with copy-paste client
  config under **Settings → Connections**.
- **Auth:** OAuth 2.1. The MCP server is an OAuth *resource server*; **Supabase's OAuth 2.1 server**
  is the authorization server (Dynamic Client Registration + PKCE). Clients discover it via
  `/.well-known/oauth-protected-resource`. The first connection opens Google sign-in and a consent
  screen (`/oauth/authorize`).
- **Tools:** `create_application`, `find_applications`, `list_applications`, `get_application`,
  `update_application`, `update_application_status`, `delete_application`, `get_search_summary`,
  `parse_job_link`.

### Supabase setup (one-time)

1. Authentication → **OAuth Server**: enable it, and enable **Dynamic Client Registration**
   (beta, free on all plans during the beta).
2. Set the **authorization (consent) URL** to `https://your-app.vercel.app/oauth/authorize`
   (`http://localhost:3000/oauth/authorize` for dev).
3. That's it — no extra env vars. The resource identifier is derived from `NEXT_PUBLIC_SITE_URL`.

### Connect a client

```bash
# Claude Code
claude mcp add --transport http momentum https://your-app.vercel.app/api/mcp
```

```json
// Cursor / any JSON MCP client
{ "mcpServers": { "momentum": { "url": "https://your-app.vercel.app/api/mcp" } } }
```

## v1 cuts (intentional)

- No screenshot/OCR import (the tile is rendered "Coming soon").
- No streak freeze.
- No realtime multi-device sync (Server Actions + `revalidatePath` are sufficient for single-user feel).
- No resume / networking / interview-prep modules. Wired into the IA so they can land in v2 without restructuring.

## License

MIT for the source code. The motivation overlay ships with no photography; if you add real photos, license them yourself.
