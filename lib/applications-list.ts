import type { ApplicationStatus, Prisma } from "@prisma/client";
import { STATUS_ORDER } from "@/components/applications/status-pill";
import type { ApplicationRow } from "@/components/applications/data-table";

export const APPLICATIONS_PAGE_SIZE = 50;
export const APPLICATIONS_CLIENT_INDEX_MAX = 5000;

export type ApplicationsSortKey = "applicationDate" | "company" | "role" | "status";

/** Which list the /applications route is showing. */
export type ApplicationsTab = "applications" | "queue";

export const APPLICATIONS_TAB_OPTIONS = [
  { value: "applications", label: "Applied" },
  { value: "queue", label: "Queue" },
] as const satisfies readonly { value: ApplicationsTab; label: string }[];

export type ApplicationsQuery = {
  page: number;
  pageSize: number;
  search: string;
  statuses: ApplicationStatus[];
  sort: ApplicationsSortKey;
  dir: "asc" | "desc";
  tab: ApplicationsTab;
};

const SORT_KEYS = new Set<ApplicationsSortKey>([
  "applicationDate",
  "company",
  "role",
  "status",
]);

function readParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
): string {
  const value = params[key];
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export function parseApplicationsQuery(
  params: Record<string, string | string[] | undefined>,
): ApplicationsQuery {
  const page = Math.max(1, Number.parseInt(readParam(params, "page"), 10) || 1);
  const sortParam = readParam(params, "sort") as ApplicationsSortKey;
  const sort = SORT_KEYS.has(sortParam) ? sortParam : "applicationDate";
  const dir = readParam(params, "dir") === "asc" ? "asc" : "desc";
  const search = readParam(params, "q").trim();
  const statuses = readParam(params, "status")
    .split(",")
    .filter((s): s is ApplicationStatus =>
      STATUS_ORDER.includes(s as ApplicationStatus),
    );
  const tab: ApplicationsTab =
    readParam(params, "tab") === "queue" ? "queue" : "applications";

  return {
    page,
    pageSize: APPLICATIONS_PAGE_SIZE,
    search,
    statuses,
    sort,
    dir,
    tab,
  };
}

export function buildApplicationsWhere(
  userId: string,
  query: ApplicationsQuery,
): Prisma.ApplicationWhereInput {
  const where: Prisma.ApplicationWhereInput = { userId };

  if (query.statuses.length) {
    where.status = { in: query.statuses };
  }

  if (query.search) {
    where.OR = [
      { company: { contains: query.search, mode: "insensitive" } },
      { role: { contains: query.search, mode: "insensitive" } },
      { location: { contains: query.search, mode: "insensitive" } },
      { notes: { contains: query.search, mode: "insensitive" } },
      { recruiter: { contains: query.search, mode: "insensitive" } },
    ];
  }

  return where;
}

export function applicationsOrderBy(
  query: ApplicationsQuery,
): Prisma.ApplicationOrderByWithRelationInput {
  return { [query.sort]: query.dir };
}

export function clampApplicationsPage(page: number, total: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return Math.min(Math.max(1, page), totalPages);
}

export function filterApplicationRows(
  rows: ApplicationRow[],
  search: string,
  statuses: ApplicationStatus[],
): ApplicationRow[] {
  let result = rows;
  const q = search.trim().toLowerCase();

  if (q) {
    result = result.filter((row) =>
      [row.company, row.role, row.location, row.notes, row.recruiter]
        .filter(Boolean)
        .some((value) => (value as string).toLowerCase().includes(q)),
    );
  }

  if (statuses.length) {
    result = result.filter((row) => statuses.includes(row.status));
  }

  return result;
}

export function sortApplicationRows(
  rows: ApplicationRow[],
  sort: { key: ApplicationsSortKey; dir: "asc" | "desc" },
): ApplicationRow[] {
  const copy = [...rows];

  copy.sort((a, b) => {
    let av: string | number = "";
    let bv: string | number = "";

    if (sort.key === "applicationDate") {
      av = new Date(a.applicationDate).getTime();
      bv = new Date(b.applicationDate).getTime();
    } else {
      av = (a[sort.key] as string).toLowerCase();
      bv = (b[sort.key] as string).toLowerCase();
    }

    if (av < bv) return sort.dir === "asc" ? -1 : 1;
    if (av > bv) return sort.dir === "asc" ? 1 : -1;
    return 0;
  });

  return copy;
}

export function paginateApplicationRows(
  rows: ApplicationRow[],
  page: number,
  pageSize: number = APPLICATIONS_PAGE_SIZE,
): ApplicationRow[] {
  const safePage = clampApplicationsPage(page, rows.length, pageSize);
  const start = (safePage - 1) * pageSize;
  return rows.slice(start, start + pageSize);
}

export function uniqueApplicationFieldValues(values: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;

    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    unique.push(trimmed);
  }

  return unique.sort((a, b) => a.localeCompare(b));
}

/**
 * The fields `toApplicationRow` reads. A full Prisma `Application` satisfies it,
 * and so does a narrowed `select` — which is why this is structural rather than
 * `Application`. The dashboard selects a subset and previously carried its own
 * byte-identical copy of the mapper; two copies of the same serialization is
 * how the dashboard ended up shipping `Date` objects to a Client Component
 * while every other surface sent ISO strings.
 */
export type ApplicationRowSource = {
  id: string;
  company: string;
  companyDomain: string | null;
  role: string;
  location: string | null;
  jobLink: string | null;
  applicationDate: Date;
  status: ApplicationRow["status"];
  salary: string | null;
  recruiter: string | null;
  referral: string | null;
  notes: string | null;
  followUpDate: Date | null;
  responseReceived: boolean;
  interviewStage: string | null;
  offerStatus: string | null;
};

export function toApplicationRow(a: ApplicationRowSource): ApplicationRow {
  return {
    id: a.id,
    company: a.company,
    companyDomain: a.companyDomain,
    role: a.role,
    location: a.location,
    jobLink: a.jobLink,
    applicationDate: a.applicationDate.toISOString(),
    status: a.status,
    salary: a.salary,
    recruiter: a.recruiter,
    referral: a.referral,
    notes: a.notes,
    followUpDate: a.followUpDate ? a.followUpDate.toISOString() : null,
    responseReceived: a.responseReceived,
    interviewStage: a.interviewStage,
    offerStatus: a.offerStatus,
  };
}

/**
 * Serialize the list state back into a query string.
 *
 * This is the only writer of /applications search params — callers rebuild the
 * whole string from scratch rather than patching it — so every piece of URL
 * state must round-trip through here or it is silently dropped on the next
 * sort, filter, or pagination click. That includes `tab`.
 */
export function applicationsQueryToSearchParams(
  query: ApplicationsQuery,
  updates: Partial<{
    page: number;
    search: string;
    statuses: ApplicationStatus[];
    sort: ApplicationsSortKey;
    dir: "asc" | "desc";
    tab: ApplicationsTab;
  }> = {},
): URLSearchParams {
  const next = { ...query, ...updates };
  const params = new URLSearchParams();

  if (next.tab !== "applications") params.set("tab", next.tab);
  if (next.search) params.set("q", next.search);
  if (next.statuses.length) params.set("status", next.statuses.join(","));
  if (next.page > 1) params.set("page", String(next.page));
  if (next.sort !== "applicationDate") params.set("sort", next.sort);
  if (next.dir !== "desc") params.set("dir", next.dir);

  return params;
}
