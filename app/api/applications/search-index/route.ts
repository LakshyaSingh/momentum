import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  APPLICATIONS_CLIENT_INDEX_MAX,
  toApplicationRow,
} from "@/lib/applications-list";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const total = await prisma.application.count({ where: { userId: user.id } });
  if (total > APPLICATIONS_CLIENT_INDEX_MAX) {
    return NextResponse.json({ rows: [], skipped: true, total });
  }

  const apps = await prisma.application.findMany({
    where: { userId: user.id },
    orderBy: { applicationDate: "desc" },
  });

  return NextResponse.json({ rows: apps.map(toApplicationRow), total });
}
