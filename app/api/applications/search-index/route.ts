import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toApplicationRow } from "@/lib/applications-list";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apps = await prisma.application.findMany({
    where: { userId: user.id },
    orderBy: { applicationDate: "desc" },
  });

  return NextResponse.json({ rows: apps.map(toApplicationRow) });
}
