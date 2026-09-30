import { createMcpHandler, withMcpAuth } from "mcp-handler";
import type { AuthInfo } from "@modelcontextprotocol/server";
import { z } from "zod";
import { ApplicationStatus } from "@prisma/client";
import { verifyAccessToken } from "@/lib/supabase/verify-token";
import {
  createApplicationForUser,
  deleteApplicationForUser,
  getApplicationForUser,
  getSearchSummaryForUser,
  listApplicationsForUser,
  transitionStatusForUser,
  updateApplicationForUser,
} from "@/lib/applications/service";
import {
  APPLICATIONS_PAGE_SIZE,
  type ApplicationsQuery,
} from "@/lib/applications-list";
import { parseJobLink } from "@/lib/job-link/extract-fields";
import { assertSafeJobUrl } from "@/lib/job-link/is-safe-url";

export const runtime = "nodejs";
export const maxDuration = 60;

const STATUS_VALUES = Object.values(ApplicationStatus) as [
  ApplicationStatus,
  ...ApplicationStatus[],
];

type ToolResult = {
  content: { type: "text"; text: string }[];
  isError?: boolean;
};

const json = (data: unknown): ToolResult => ({
  content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
});
const fail = (message: string): ToolResult => ({
  content: [{ type: "text", text: message }],
  isError: true,
});

/** Pull the token-scoped user out of the request auth info. */
function authedUser(ctx: { http?: { authInfo?: AuthInfo } }) {
  const info = ctx.http?.authInfo?.extra as
    | { userId?: string; timezone?: string }
    | undefined;
  if (!info?.userId) return null;
  return { userId: info.userId, timezone: info.timezone ?? "UTC" };
}

function buildQuery(input: {
  page?: number;
  pageSize?: number;
  query?: string;
  statuses?: ApplicationStatus[];
  sort?: ApplicationsQuery["sort"];
  dir?: ApplicationsQuery["dir"];
}): ApplicationsQuery {
  return {
    page: input.page && input.page > 0 ? input.page : 1,
    pageSize: Math.min(input.pageSize ?? APPLICATIONS_PAGE_SIZE, 200),
    search: input.query?.trim() ?? "",
    statuses: input.statuses ?? [],
    sort: input.sort ?? "applicationDate",
    dir: input.dir ?? "desc",
    // MCP tools operate on logged applications only; the queue is web-UI only.
    tab: "applications",
  };
}

// Tool annotations are hints for clients deciding what to confirm with the
// user. Every tool touches only the caller's own tracker, so none is open-world
// except parse_job_link, which fetches a public URL.
const READ_ONLY = { readOnlyHint: true, openWorldHint: false } as const;
const WRITE = { readOnlyHint: false, destructiveHint: false, openWorldHint: false } as const;

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "create_application",
      {
        title: "Create application",
        description:
          "Add a job application to the tracker. Use this when an email confirms a new application was submitted (e.g. a 'thanks for applying' message). applicationDate defaults to today if omitted.",
        inputSchema: z.object({
          company: z.string().min(1).describe("Company name"),
          role: z.string().min(1).describe("Job title / role"),
          status: z
            .enum(STATUS_VALUES)
            .optional()
            .describe("Defaults to APPLIED"),
          applicationDate: z
            .string()
            .optional()
            .describe("ISO date or YYYY-MM-DD; defaults to today"),
          location: z.string().optional(),
          jobLink: z.string().optional().describe("URL to the job posting"),
          companyDomain: z
            .string()
            .optional()
            .describe("Company website domain, e.g. stripe.com"),
          salary: z.string().optional(),
          recruiter: z.string().optional(),
          referral: z.string().optional(),
          notes: z.string().optional(),
          interviewStage: z.string().optional(),
          offerStatus: z.string().optional(),
          followUpDate: z.string().optional().describe("ISO date"),
        }),
        annotations: { ...WRITE, idempotentHint: false },
      },
      async (input, ctx) => {
        const auth = authedUser(ctx);
        if (!auth) return fail("Unauthorized");
        const result = await createApplicationForUser(
          auth.userId,
          auth.timezone,
          {
            company: input.company,
            role: input.role,
            status: input.status ?? ApplicationStatus.APPLIED,
            applicationDate: input.applicationDate
              ? new Date(input.applicationDate)
              : new Date(),
            location: input.location,
            jobLink: input.jobLink,
            companyDomain: input.companyDomain,
            salary: input.salary,
            recruiter: input.recruiter,
            referral: input.referral,
            notes: input.notes,
            interviewStage: input.interviewStage,
            offerStatus: input.offerStatus,
            followUpDate: input.followUpDate
              ? new Date(input.followUpDate)
              : undefined,
          } as Parameters<typeof createApplicationForUser>[2],
        );
        if (!result.ok) return fail(result.error);
        return json({
          ok: true,
          id: result.id,
          currentStreak: result.currentStreak,
          milestone: result.milestone,
        });
      },
    );

    server.registerTool(
      "find_applications",
      {
        title: "Find applications",
        description:
          "Search applications by free text (company, role, location, notes, recruiter) and/or status. Returns matching rows WITH their ids — use this to locate an application before updating its status.",
        inputSchema: z.object({
          query: z.string().optional().describe("Free-text search"),
          statuses: z.array(z.enum(STATUS_VALUES)).optional(),
          limit: z.number().int().min(1).max(200).optional(),
        }),
        annotations: READ_ONLY,
      },
      async (input, ctx) => {
        const auth = authedUser(ctx);
        if (!auth) return fail("Unauthorized");
        const result = await listApplicationsForUser(
          auth.userId,
          buildQuery({
            query: input.query,
            statuses: input.statuses,
            pageSize: input.limit ?? 25,
          }),
        );
        return json({ total: result.total, matches: result.rows });
      },
    );

    server.registerTool(
      "list_applications",
      {
        title: "List applications",
        description:
          "Paginated, sortable list of the user's applications with optional text/status filters.",
        inputSchema: z.object({
          page: z.number().int().min(1).optional(),
          pageSize: z.number().int().min(1).max(200).optional(),
          query: z.string().optional(),
          statuses: z.array(z.enum(STATUS_VALUES)).optional(),
          sort: z
            .enum(["applicationDate", "company", "role", "status"])
            .optional(),
          dir: z.enum(["asc", "desc"]).optional(),
        }),
        annotations: READ_ONLY,
      },
      async (input, ctx) => {
        const auth = authedUser(ctx);
        if (!auth) return fail("Unauthorized");
        const result = await listApplicationsForUser(
          auth.userId,
          buildQuery(input),
        );
        return json(result);
      },
    );

    server.registerTool(
      "get_application",
      {
        title: "Get application",
        description:
          "Fetch a single application by id, including its full status timeline.",
        inputSchema: z.object({ id: z.string().min(1) }),
        annotations: READ_ONLY,
      },
      async ({ id }, ctx) => {
        const auth = authedUser(ctx);
        if (!auth) return fail("Unauthorized");
        const app = await getApplicationForUser(auth.userId, id);
        if (!app) return fail("Not found");
        return json(app);
      },
    );

    server.registerTool(
      "update_application_status",
      {
        title: "Update application status",
        description:
          "Transition an application to a new status (writes a timeline event). Use this when an email changes the outcome — e.g. a rejection ('we've moved forward with other candidates') sets status to REJECTED.",
        inputSchema: z.object({
          id: z.string().min(1),
          status: z.enum(STATUS_VALUES),
        }),
        annotations: { ...WRITE, idempotentHint: false },
      },
      async ({ id, status }, ctx) => {
        const auth = authedUser(ctx);
        if (!auth) return fail("Unauthorized");
        const result = await transitionStatusForUser(auth.userId, id, status);
        if (!result.ok) return fail(result.error);
        return json({ ok: true, id, status });
      },
    );

    server.registerTool(
      "update_application",
      {
        title: "Update application",
        description:
          "Update one or more fields of an existing application. Only provided fields change. Changing `status` also records a timeline event.",
        inputSchema: z.object({
          id: z.string().min(1),
          company: z.string().optional(),
          role: z.string().optional(),
          status: z.enum(STATUS_VALUES).optional(),
          applicationDate: z.string().optional(),
          location: z.string().optional(),
          jobLink: z.string().optional(),
          companyDomain: z.string().optional(),
          salary: z.string().optional(),
          recruiter: z.string().optional(),
          referral: z.string().optional(),
          notes: z.string().optional(),
          interviewStage: z.string().optional(),
          offerStatus: z.string().optional(),
          followUpDate: z.string().optional(),
        }),
        annotations: { ...WRITE, idempotentHint: false },
      },
      async (input, ctx) => {
        const auth = authedUser(ctx);
        if (!auth) return fail("Unauthorized");
        const { id, applicationDate, followUpDate, ...rest } = input;
        const result = await updateApplicationForUser(auth.userId, {
          id,
          ...rest,
          ...(applicationDate
            ? { applicationDate: new Date(applicationDate) }
            : {}),
          ...(followUpDate ? { followUpDate: new Date(followUpDate) } : {}),
        });
        if (!result.ok) return fail(result.error);
        return json({ ok: true, id });
      },
    );

    server.registerTool(
      "delete_application",
      {
        title: "Delete application",
        description: "Permanently delete an application by id.",
        inputSchema: z.object({ id: z.string().min(1) }),
        annotations: {
          readOnlyHint: false,
          destructiveHint: true,
          idempotentHint: true,
          openWorldHint: false,
        },
      },
      async ({ id }, ctx) => {
        const auth = authedUser(ctx);
        if (!auth) return fail("Unauthorized");
        await deleteApplicationForUser(auth.userId, id);
        return json({ ok: true, id });
      },
    );

    server.registerTool(
      "get_search_summary",
      {
        title: "Get job-search summary",
        description:
          "Return an aggregate snapshot of the user's job search: totals, current/longest streak, per-status counts, the applied→offer funnel, productivity stats (best day, avg/week, response & interview rates), and top companies. Use this to answer natural-language questions about how the search is going.",
        inputSchema: z.object({}),
        annotations: READ_ONLY,
      },
      async (_input, ctx) => {
        const auth = authedUser(ctx);
        if (!auth) return fail("Unauthorized");
        const summary = await getSearchSummaryForUser(
          auth.userId,
          auth.timezone,
        );
        return json(summary);
      },
    );

    server.registerTool(
      "parse_job_link",
      {
        title: "Parse job link",
        description:
          "Extract structured fields (company, role, location, salary, source) from a public job posting URL. Use before create_application to prefill details. Does not save anything.",
        inputSchema: z.object({ url: z.string().min(1).max(2048) }),
        annotations: { readOnlyHint: true, openWorldHint: true },
      },
      async ({ url }, ctx) => {
        const auth = authedUser(ctx);
        if (!auth) return fail("Unauthorized");
        try {
          assertSafeJobUrl(url);
        } catch (err) {
          return fail(err instanceof Error ? err.message : "Invalid URL");
        }
        const result = await parseJobLink(url);
        if (!result.ok) return fail(result.error);
        return json({
          fields: result.fields,
          source: result.source,
          warning: result.warning,
        });
      },
    );
  },
  {
    serverInfo: { name: "momentum", version: "2.0.0" },
    instructions:
      "Momentum is the user's job application tracker. Use find_applications to get an id before updating or deleting. Use get_search_summary for questions about progress, streaks or response rates.",
  },
);

const authHandler = withMcpAuth(handler, async (_req, bearerToken) => {
  if (!bearerToken) return undefined;
  const verified = await verifyAccessToken(bearerToken);
  if (!verified) return undefined;
  return {
    token: bearerToken,
    clientId: verified.clientId ?? "unknown",
    scopes: ["momentum:read", "momentum:write"],
    extra: { userId: verified.user.id, timezone: verified.user.timezone },
  } satisfies AuthInfo;
}, {
  required: true,
  // withMcpAuth builds the advertised metadata URL as `${origin}${path}`, so the
  // path must resolve against the request origin (→ /.well-known/oauth-protected-resource,
  // where that route is served). Origin is auto-detected from proxy headers.
  resourceMetadataPath: "/.well-known/oauth-protected-resource",
});

// The 2026-07-28 spec is stateless; 2025-era clients are served by the SDK's
// stateless fallback, which answers GET/DELETE session calls with 405.
export { authHandler as GET, authHandler as POST, authHandler as DELETE };
