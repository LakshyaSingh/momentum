import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { QuickAdd } from "@/components/applications/quick-add";
import { ApplicationsView } from "@/components/applications/applications-view";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import {
  applicationsOrderBy,
  buildApplicationsWhere,
  clampApplicationsPage,
  parseApplicationsQuery,
  toApplicationRow,
} from "@/lib/applications-list";

export const dynamic = "force-dynamic";

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const query = parseApplicationsQuery(params);
  const where = buildApplicationsWhere(user.id, query);
  const hasFilters = Boolean(query.search || query.statuses.length);

  const [filteredTotal, totalAll] = await Promise.all([
    prisma.application.count({ where }),
    prisma.application.count({ where: { userId: user.id } }),
  ]);

  const page = clampApplicationsPage(query.page, filteredTotal, query.pageSize);
  const skip = (page - 1) * query.pageSize;

  const apps = await prisma.application.findMany({
    where,
    orderBy: applicationsOrderBy({ ...query, page }),
    skip,
    take: query.pageSize,
  });

  const rows = apps.map(toApplicationRow);

  return (
    <div className="space-y-8">
      <ScrollReveal as="header" className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-display-md font-semibold tracking-tight">Applications</h1>
          <p className="mt-1 text-muted-foreground">
            {totalAll === 0
              ? "Log your first application. Momentum starts now."
              : `${totalAll} ${totalAll === 1 ? "application" : "applications"}, all in one place.`}
          </p>
        </div>
        <QuickAdd />
      </ScrollReveal>

      <ScrollReveal delay={0.05}>
        <Suspense fallback={null}>
          <ApplicationsView
            serverRows={rows}
            filteredTotal={filteredTotal}
            totalAll={totalAll}
            query={{ ...query, page }}
          />
        </Suspense>
      </ScrollReveal>
    </div>
  );
}
