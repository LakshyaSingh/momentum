import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GlassCard } from "@/components/glass/glass-card";
import { StatusPill, STATUS_LABELS } from "@/components/applications/status-pill";
import { responseReceivedForStatus } from "@/lib/response-received";
import { formatDate, formatRelative } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/motion/scroll-reveal";

export const dynamic = "force-dynamic";

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const app = await prisma.application.findFirst({
    where: { id, userId: user.id },
    include: {
      events: { orderBy: { occurredAt: "asc" } },
    },
  });
  if (!app) notFound();

  return (
    <div className="space-y-8">
      <Button asChild variant="ghost" size="sm" className="-ml-3">
        <Link href="/applications">
          <ArrowLeft className="size-4" /> All applications
        </Link>
      </Button>

      <ScrollReveal as="header" className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <StatusPill status={app.status} />
          {responseReceivedForStatus(app.status) && (
            <span className="text-xs text-muted-foreground">Response received</span>
          )}
        </div>
        <h1 className="text-display-md font-semibold tracking-tight">{app.role}</h1>
        <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
          <span className="text-lg text-foreground/80">{app.company}</span>
          {app.location && <span>· {app.location}</span>}
          {app.jobLink && (
            <a
              href={app.jobLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm hover:text-foreground"
            >
              View posting <ExternalLink className="size-3.5" />
            </a>
          )}
        </div>
      </ScrollReveal>

      <ScrollReveal delay={0.05}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <DetailItem label="Applied">{formatDate(app.applicationDate)}</DetailItem>
          <DetailItem label="Salary">{app.salary ?? "-"}</DetailItem>
          <DetailItem label="Recruiter">{app.recruiter ?? "-"}</DetailItem>
          <DetailItem label="Referral">{app.referral ?? "-"}</DetailItem>
          <DetailItem label="Follow-up">
            {app.followUpDate ? formatDate(app.followUpDate) : "-"}
          </DetailItem>
          <DetailItem label="Interview stage">{app.interviewStage ?? "-"}</DetailItem>
        </div>
      </ScrollReveal>

      {app.notes && (
        <ScrollReveal>
          <GlassCard className="p-6">
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">Notes</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{app.notes}</p>
          </GlassCard>
        </ScrollReveal>
      )}

      <ScrollReveal>
        <GlassCard className="p-6">
          <h2 className="mb-4 text-sm font-medium text-muted-foreground">Timeline</h2>
          <ol className="space-y-4">
            {app.events.map((e, i) => (
              <li key={e.id} className="relative pl-6">
                <span className="absolute left-0 top-1.5 size-3 rounded-full bg-foreground/80" />
                {i < app.events.length - 1 && (
                  <span className="absolute left-[5px] top-4 h-full w-px bg-border" />
                )}
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-medium">{STATUS_LABELS[e.status]}</span>
                  <span className="text-xs text-muted-foreground">{formatRelative(e.occurredAt)}</span>
                </div>
                {e.note && <p className="mt-1 text-sm text-muted-foreground">{e.note}</p>}
              </li>
            ))}
          </ol>
        </GlassCard>
      </ScrollReveal>
    </div>
  );
}

function DetailItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <GlassCard className="p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium">{children}</div>
    </GlassCard>
  );
}
