import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getHeatmapApplications, heatmapSinceDate } from "@/lib/calendar-data";
import { getDashboardSnapshot } from "@/lib/dashboard-data";

/** Warms cached dashboard + calendar data for faster client navigations. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await Promise.all([
    getDashboardSnapshot(user.id, user.timezone),
    getHeatmapApplications(user.id, heatmapSinceDate()),
  ]);

  return NextResponse.json({ ok: true });
}
