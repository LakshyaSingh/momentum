import type { QueuedJob } from "@prisma/client";

/** Serializable queue row handed to client components. Dates become ISO strings. */
export type QueuedJobRow = {
  id: string;
  company: string | null;
  companyDomain: string | null;
  role: string | null;
  location: string | null;
  jobLink: string;
  salary: string | null;
  notes: string | null;
  createdAt: string;
};

export function toQueuedJobRow(job: QueuedJob): QueuedJobRow {
  return {
    id: job.id,
    company: job.company,
    companyDomain: job.companyDomain,
    role: job.role,
    location: job.location,
    jobLink: job.jobLink,
    salary: job.salary,
    notes: job.notes,
    createdAt: job.createdAt.toISOString(),
  };
}

/**
 * Raw hostname for display, `www.` stripped.
 *
 * Deliberately not `domainFromJobLink` from lib/company-logo: that resolves a
 * *company* domain and returns undefined for ATS vendors like greenhouse.io,
 * which is right for logos and wrong here — for a row we cannot label yet,
 * "boards.greenhouse.io" is the most honest thing to show.
 */
export function hostnameFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return null;
  }
}

/** What to show in the company column before the parse has resolved a name. */
export function queuedJobLabel(row: QueuedJobRow): string {
  const company = row.company?.trim();
  if (company) return company;
  return hostnameFromUrl(row.jobLink) ?? "Untitled";
}

/**
 * True when the row can become an Application without asking anything else.
 * ApplicationSchema requires both company and role, so a row missing either
 * has to go through the prefilled form instead of one-click apply.
 */
export function canApplyDirectly(row: QueuedJobRow): boolean {
  return Boolean(row.company?.trim() && row.role?.trim());
}

/** Whole days since the row was queued. 0 means today. */
export function daysWaiting(createdAt: string, now = Date.now()): number {
  const started = new Date(createdAt).getTime();
  if (Number.isNaN(started)) return 0;
  return Math.max(0, Math.floor((now - started) / 86_400_000));
}

export function waitingLabel(days: number): string {
  if (days <= 0) return "Added today";
  if (days === 1) return "Waiting 1 day";
  return `Waiting ${days} days`;
}
