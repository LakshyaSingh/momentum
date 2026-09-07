import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { QuickAdd } from "@/components/applications/quick-add";
import { ApplicationsTabsView } from "@/components/applications/applications-tabs-view";
import { DeclarativeGlassSceneRegistration } from "@/components/glass/declarative-glass-scene";
import { ApplicationsGlassScene } from "@/components/glass/primary-route-glass-scenes";
import {
  applicationsOrderBy,
  buildApplicationsWhere,
  clampApplicationsPage,
  parseApplicationsQuery,
  toApplicationRow,
} from "@/lib/applications-list";
import { toQueuedJobRow } from "@/lib/queued-jobs";

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
  const isFiltered = Boolean(query.search || query.statuses.length);

  // The pooled DATABASE_URL runs with connection_limit=1, so Promise.all here
  // buys nothing — these execute back to back regardless. Issue the smallest
  // number of queries instead: with no filter applied the two counts are the
  // same number, and the queue is small enough that findMany doubles as a count.
  const totalAll = await prisma.application.count({ where: { userId: user.id } });
  const filteredTotal = isFiltered ? await prisma.application.count({ where }) : totalAll;

  const page = clampApplicationsPage(query.page, filteredTotal, query.pageSize);
  const skip = (page - 1) * query.pageSize;

  // Both lists load up front so the Applied/Queue toggle never touches the
  // network — see ApplicationsTabsView.
  const apps = await prisma.application.findMany({
    where,
    orderBy: applicationsOrderBy({ ...query, page }),
    skip,
    take: query.pageSize,
  });
  const queuedJobs = await prisma.queuedJob.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  const rows = apps.map(toApplicationRow);
  const queuedRows = queuedJobs.map(toQueuedJobRow);
  const queuedCount = queuedRows.length;

  return (
    <div className="space-y-8">
      <DeclarativeGlassSceneRegistration id="applications">
        <ApplicationsGlassScene
          rows={rows}
          queuedRows={queuedRows}
          total={totalAll}
          filteredTotal={filteredTotal}
          queuedCount={queuedCount}
          query={{ ...query, page }}
        />
      </DeclarativeGlassSceneRegistration>
      <Suspense fallback={null}>
        <ApplicationsTabsView
          rows={rows}
          queuedRows={queuedRows}
          filteredTotal={filteredTotal}
          totalAll={totalAll}
          query={{ ...query, page }}
          quickAdd={<QuickAdd />}
        />
      </Suspense>
    </div>
  );
}
