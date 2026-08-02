# Momentum

**A habit-driven job application tracker with a native AI-agent interface.**

[**Live app →**](https://momentum-delta-five.vercel.app)

Momentum treats a job search as a daily practice rather than a spreadsheet. It tracks every
application through a real hiring funnel, turns consistency into a visible streak, and exposes the
whole tracker to AI agents over the Model Context Protocol so the busywork of logging and updating
applications can be automated away.

## Why it exists

Most job-search tracking dies in a spreadsheet. Two reasons: the manual data entry is tedious enough
that people stop doing it, and a flat sheet of rows cannot answer the questions that actually matter
("is my resume converting?", "which companies respond?", "am I applying consistently?").

Momentum addresses both. Every status change is persisted as a discrete event, so the funnel and
response rates are derived from real history rather than a single mutable status column. And because
the tracker is exposed as an MCP server, an AI agent can do the data entry: an agent with inbox
access can log a new application when a confirmation email arrives and move one to `REJECTED` when a
rejection lands, with no human typing involved.

## Features

**Application tracking.** A filterable, sortable table over nine funnel stages (applied, OA,
recruiter screen, interview, final round, offer, rejected, ghosted, withdrawn), with a rich
create/edit sheet, per-application status timeline, and optimistic updates.

**Habit engine.** Timezone-aware streak tracking computed from the user's own local day boundaries, a
daily-goal ring, a week sparkline, and milestone celebrations at 3, 7, 14, 30, and 100 days.

**Analytics.** Applications over time across selectable ranges, a custom SVG conversion funnel, top
companies by volume and positive-response rate, and productivity stats including response rate,
interview rate, best day, and average per week.

**Smart job-link parsing.** Paste a posting URL and Momentum extracts company, role, location, and
salary. Rather than trusting a single source, it runs layered extractors (JSON-LD, microdata, Open
Graph, meta tags, DOM, URL heuristics, text patterns) and merges the results by confidence score,
with dedicated adapters for eight ATS platforms including Greenhouse, Lever, Ashby, Workday,
SmartRecruiters, and BambooHR.

**Bulk import.** Drag-and-drop Excel and CSV import with column mapping, per-row schema validation,
and a transactional insert so a partial failure cannot leave half a file committed.

**Calendar heatmap.** A 53x7 GitHub-style contribution grid with click-through detail.

**Design system.** A "liquid glass" component layer built on layered translucency and backdrop blur,
an ambient mesh background, and a floating adaptive nav. Motion respects `prefers-reduced-motion`
throughout.

## AI agent integration (MCP)

Momentum ships a remote [Model Context Protocol](https://modelcontextprotocol.io) server, so any
MCP-capable agent (Claude, Cursor, Codex) can operate the tracker on a user's behalf.

The intended workflow is a three-way pipeline: **email tool → agent → Momentum**. The agent polls
the inbox on whatever cadence its user chooses, and calls Momentum's tools to create applications,
transition statuses, or answer natural-language questions about the search. Momentum itself never
touches anyone's email; it is a stateless request/response API, and scheduling stays the agent's
responsibility.

**Nine tools** are exposed: `create_application`, `find_applications`, `list_applications`,
`get_application`, `update_application`, `update_application_status`, `delete_application`,
`get_search_summary`, and `parse_job_link`.

**Authorization is OAuth 2.1**, per user, following the MCP authorization spec. Momentum acts purely
as an OAuth *resource server*; Supabase's OAuth 2.1 server is the authorization server, providing
Dynamic Client Registration and PKCE. Clients discover it through RFC 9728 protected-resource
metadata at `/.well-known/oauth-protected-resource`, users approve each agent on a consent screen
before it receives any access, and presented tokens are validated for both issuer and audience
(RFC 8707) so a token minted for another service cannot be replayed against Momentum. Every query is
scoped to the authenticated user id.

Connection instructions with copy-paste client config live in the app under **Settings →
Connections**.

## Architecture

**Server-first data flow.** Built on the Next.js App Router with React Server Components by default.
Mutations are Server Actions, validated with Zod on both the client and again inside the action.
There is no client-side data cache: server state flows through Server Actions plus explicit
revalidation.

**A shared service core.** Application read and write logic lives in one `userId`-parameterized
service module that both entry points call: the web Server Actions (thin `requireUser()` wrappers)
and the MCP tool handlers. The two surfaces cannot drift, and a change to business rules applies to
both at once.

**Event-sourced status history.** Each status transition appends a `StatusEvent` row. The funnel,
timeline, and response metrics are computed from that event stream, so the analytics reflect what
actually happened rather than a current-state snapshot.

**Deliberate caching.** Expensive dashboard, streak, and calendar reads are wrapped in cached
readers keyed by a per-user tag; every mutation invalidates the affected routes and that tag
together. Two prefetch routes warm those caches during browser idle time to keep navigation instant.

**Defense in depth on data access.** Postgres runs with row-level security denied by default, and
authorization is enforced in application code on every query. Job-link fetching sits behind an SSRF
guard that rejects private and link-local addresses before any outbound request.

## Tech stack

| Layer          | Choice                                                             |
| -------------- | ------------------------------------------------------------------ |
| Framework      | Next.js 15 (App Router, React Server Components, Server Actions)   |
| Language       | TypeScript                                                         |
| Database       | Supabase Postgres with Prisma                                      |
| Auth           | Supabase Auth (Google OAuth), Supabase OAuth 2.1 server for agents |
| Agent protocol | Model Context Protocol over Streamable HTTP                        |
| Styling        | Tailwind CSS, shadcn/ui on Radix primitives                        |
| Animation      | Framer Motion                                                      |
| Charts         | Recharts, plus custom SVG funnel and heatmap                       |
| Forms          | React Hook Form with Zod                                           |
| Client state   | Zustand                                                            |
| Import         | SheetJS and PapaParse                                              |
| Hosting        | Vercel, with a scheduled cron keeping the database warm            |

## Scope decisions

Some things were cut on purpose, and the information architecture leaves room for them:

- No screenshot or OCR import.
- No realtime multi-device sync. Server Actions with targeted revalidation are sufficient for a
  single-user feel, at a fraction of the complexity.
- No resume, networking, or interview-prep modules yet.
- Agent-side email polling is intentionally out of scope. Momentum never asks for inbox credentials;
  that trust boundary stays with the user's own agent.

## License

MIT.
