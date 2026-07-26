import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Keep-alive endpoint for the Supabase free tier.
 *
 * Free projects are paused after 7 consecutive days without a database request.
 * A daily Vercel Cron (see `vercel.json`) hits this route, which issues a trivial
 * `SELECT 1` so the DB stays "active" and the project never sleeps between visits
 * from recruiters / MCP agents.
 *
 * Must run on the Node runtime (Prisma) and never be statically cached.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Vercel automatically sends `Authorization: Bearer <CRON_SECRET>` on cron
  // invocations when the env var is set. Only enforce when it's configured, so
  // the route still works (harmlessly) if you haven't set a secret yet.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, ts: new Date().toISOString() });
  } catch (error) {
    console.error("keep-alive DB ping failed", error);
    return NextResponse.json({ ok: false, error: "DB unreachable" }, { status: 503 });
  }
}
