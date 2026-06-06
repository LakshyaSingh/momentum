import type { ApplicationStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  APPLIED: "Applied",
  OA: "OA",
  RECRUITER_SCREEN: "Recruiter screen",
  INTERVIEW: "Interview",
  FINAL_ROUND: "Final round",
  OFFER: "Offer",
  REJECTED: "Rejected",
  GHOSTED: "Ghosted",
  WITHDRAWN: "Withdrawn",
};

export const STATUS_ORDER: ApplicationStatus[] = [
  "APPLIED",
  "OA",
  "RECRUITER_SCREEN",
  "INTERVIEW",
  "FINAL_ROUND",
  "OFFER",
  "REJECTED",
  "GHOSTED",
  "WITHDRAWN",
];

const STATUS_TOKENS: Record<ApplicationStatus, string> = {
  APPLIED: "applied",
  OA: "oa",
  RECRUITER_SCREEN: "screen",
  INTERVIEW: "interview",
  FINAL_ROUND: "final",
  OFFER: "offer",
  REJECTED: "rejected",
  GHOSTED: "ghosted",
  WITHDRAWN: "withdrawn",
};

export function statusColor(status: ApplicationStatus) {
  return `hsl(var(--status-${STATUS_TOKENS[status]}))`;
}

export function StatusPill({ status, className }: { status: ApplicationStatus; className?: string }) {
  const token = STATUS_TOKENS[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium",
        className,
      )}
      style={{
        color: `hsl(var(--status-${token}))`,
        background: `hsl(var(--status-${token}) / 0.10)`,
        borderColor: `hsl(var(--status-${token}) / 0.25)`,
      }}
    >
      <span
        className="size-1.5 shrink-0 rounded-full"
        style={{ background: `hsl(var(--status-${token}))` }}
      />
      {STATUS_LABELS[status]}
    </span>
  );
}
