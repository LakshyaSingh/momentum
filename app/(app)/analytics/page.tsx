import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeStreaksForUser } from "@/lib/streak";
import { buildFunnel, buildProductivity } from "@/lib/analytics";
import { AnalyticsClient } from "@/components/analytics/analytics-client";
import { ScrollReveal } from "@/components/motion/scroll-reveal";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const user = await requireUser();

  const [applications, streaks] = await Promise.all([
    prisma.application.findMany({
      where: { userId: user.id },
      include: { events: true },
      orderBy: { applicationDate: "asc" },
    }),
    computeStreaksForUser(user.id, user.timezone),
  ]);

  const funnel = buildFunnel(applications);
  const productivity = buildProductivity(applications, streaks.longest);

  const clientApps = applications.map((a) => ({
    id: a.id,
    applicationDate: a.applicationDate.toISOString(),
    company: a.company,
    status: a.status,
  }));

  return (
    <div className="space-y-8">
      <ScrollReveal as="header">
        <h1 className="text-display-md font-semibold tracking-tight">Analytics</h1>
        <p className="mt-1 text-muted-foreground">
          Patterns hide in your data. Here&apos;s what we found.
        </p>
      </ScrollReveal>

      <AnalyticsClient
        applications={clientApps}
        funnel={funnel}
        productivity={productivity}
      />
    </div>
  );
}
