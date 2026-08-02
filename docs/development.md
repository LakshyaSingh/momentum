# Development setup

Local setup, Supabase configuration, and deployment notes. Moved out of the README to keep that
document focused on what the project is rather than how to run it.

## Quick start

```bash
npm install
cp .env.example .env.local
# fill in DATABASE_URL, DIRECT_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run db:migrate   # creates the schema in your Supabase Postgres
npm run db:seed      # ~120 demo applications for demo@momentum.app
npm run dev          # http://localhost:3000
```

## Scripts

```bash
npm run dev          # Next.js dev server
npm run build        # prisma generate && next build
npm run lint         # ESLint
npm run db:migrate   # prisma migrate dev
npm run db:deploy    # prisma migrate deploy (CI/prod)
npm run db:push      # schema sync without a migration
npm run db:seed      # tsx prisma/seed.ts
npm run db:studio    # Prisma Studio
```

All `db:*` scripts load env from `.env.local` via `dotenv-cli`, so they will not pick up `.env` or
shell environment variables.

### Tests

There is no test runner. Tests are standalone `tsx` scripts that assert and exit non-zero on failure:

```bash
npm run test:job-parse      # lib/job-link/extract-fields.test.ts
npm run test:company-logo   # lib/company-logo.test.ts
npm run test:company-lookup # lib/company-lookup.test.ts
npm run test:analytics      # lib/analytics.test.ts
npx tsx lib/<file>.test.ts  # run any single test file directly
```

## Supabase setup

1. **Create a project** at [supabase.com](https://supabase.com).
2. **Connection strings** (Settings → Database → "Connection string"):
   - `DATABASE_URL`: the "Transaction pooler" string (port `6543`; append
     `?pgbouncer=true&connection_limit=1` if missing).
   - `DIRECT_URL`: "Session pooler" or direct connection (port `5432`). Used only by
     `prisma migrate`.
3. **Auth keys** (Settings → API):
   - `NEXT_PUBLIC_SUPABASE_URL`: project URL.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: the `anon` public key.
   - `SUPABASE_SERVICE_ROLE_KEY`: the `service_role` key. Server-only, never expose it.
4. **Auth URLs** (Authentication → URL Configuration):
   - **Site URL**: `http://localhost:3000` for dev, your live URL in production.
   - **Redirect URLs**: add `/api/auth/callback` and `/api/auth/recovery` for both localhost and your
     production domain. Without these, email links point at localhost and auth breaks in production.
5. **Email templates** (recommended). Including the token hash lets links work from mail apps that do
   not carry PKCE cookies.

   Authentication → Email Templates → **Confirm signup**:

   ```html
   <h2>Confirm your signup</h2>
   <p><a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=signup">Confirm your email</a></p>
   ```

   Authentication → Email Templates → **Reset password**:

   ```html
   <h2>Reset password</h2>
   <p><a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery">Reset your password</a></p>
   ```

6. Run `npm run db:migrate`, then `npm run db:seed`.

> **Demo mode**: if the Supabase env vars are absent the app falls back to a single hard-coded demo
> user, but Prisma still needs a real `DATABASE_URL`. There is no in-memory store.

## MCP server setup (one-time)

The MCP server needs Supabase's OAuth 2.1 server acting as its authorization server:

1. Authentication → **OAuth Server**: enable it, and enable **Dynamic Client Registration** so MCP
   clients can register themselves. Both are free during the beta.
2. Set the **Authorization Path** to `/oauth/authorize`, which is the consent screen this app serves.
   Supabase redirects users there to approve each agent.
3. No extra env vars are required. The RFC 8707 resource identifier is derived from
   `NEXT_PUBLIC_SITE_URL`, so that must match the deployed origin.

### Connecting a client

```bash
# Claude Code
claude mcp add --transport http momentum https://your-app.vercel.app/api/mcp
```

```bash
# Codex CLI
codex mcp add momentum --url https://your-app.vercel.app/api/mcp
```

```json
// Cursor or any JSON-configured MCP client
{ "mcpServers": { "momentum": { "url": "https://your-app.vercel.app/api/mcp" } } }
```

### Verifying the server

```bash
curl -i https://your-app.vercel.app/api/mcp                          # expect 401 + WWW-Authenticate
curl https://your-app.vercel.app/.well-known/oauth-protected-resource # expect the AS metadata
npx @modelcontextprotocol/inspector                                   # full OAuth + tool round trip
```

## Deployment

Deployed on Vercel. Set `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `NEXT_PUBLIC_SITE_URL` in the
project settings for each environment you use, and add the deployed URL to Supabase's redirect list.

`prisma generate` runs automatically via `postinstall`. Migrations are **not** run on deploy: run
`npm run db:deploy` against Supabase whenever the schema changes.

### Keeping the database awake

Supabase pauses free-tier projects after 7 consecutive days without a database request. `vercel.json`
schedules a daily cron against `/api/keep-alive`, which issues a trivial `SELECT 1`. Set a
`CRON_SECRET` env var to restrict that endpoint to Vercel's scheduler. On the Hobby plan crons run at
most once per day and may fire anywhere within the scheduled hour.

## Content notes

The motivation overlay renders quotes over a gradient backdrop; no photography ships with the project,
to avoid licensing issues. Quotes live in [`content/jobs-quotes.ts`](../content/jobs-quotes.ts), each
carrying a documented `source`. Keep new entries verifiable against a primary source.
