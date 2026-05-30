import { unstable_cache } from "next/cache";
import type { ApplicationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { applicationStatsTag } from "@/lib/streak";

export type HeatmapApplication = {
  id: string;
  company: string;
  role: string;
  status: ApplicationStatus;
  applicationDate: string;
};

const HEATMAP_WEEKS = 53;

export function heatmapSinceDate() {
  const since = new Date();
  since.setDate(since.getDate() - HEATMAP_WEEKS * 7);
  since.setHours(0, 0, 0, 0);
  return since;
}

async function loadHeatmapApplications(
  userId: string,
  sinceIso: string,
): Promise<HeatmapApplication[]> {
  const since = new Date(sinceIso);
  const applications = await prisma.application.findMany({
    where: { userId, applicationDate: { gte: since } },
    orderBy: { applicationDate: "asc" },
    select: {
      id: true,
      company: true,
      role: true,
      status: true,
      applicationDate: true,
    },
  });

  return applications.map((a) => ({
    id: a.id,
    company: a.company,
    role: a.role,
    status: a.status,
    applicationDate: a.applicationDate.toISOString(),
  }));
}

export function getHeatmapApplications(userId: string, since: Date) {
  const sinceIso = since.toISOString();

  return unstable_cache(
    () => loadHeatmapApplications(userId, sinceIso),
    ["heatmap-applications", userId, sinceIso.slice(0, 10)],
    {
      revalidate: 300,
      tags: [applicationStatsTag(userId)],
    },
  )();
}
