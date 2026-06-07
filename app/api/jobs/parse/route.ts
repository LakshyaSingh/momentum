import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { parseJobLink } from "@/lib/job-link/extract-fields";
import { assertSafeJobUrl } from "@/lib/job-link/is-safe-url";

const BodySchema = z.object({
  url: z.string().trim().min(1, "Job link is required").max(2048),
});

export async function POST(request: Request) {
  // Guard session resolution: if getCurrentUser throws (Supabase/Prisma
  // hiccup) it would otherwise escape as an unhandled 500 with a non-JSON
  // body, and any client that renders that body can crash. Always return a
  // JSON { error: string }.
  let user: Awaited<ReturnType<typeof getCurrentUser>>;
  try {
    user = await getCurrentUser();
  } catch {
    return NextResponse.json({ error: "Could not verify your session." }, { status: 500 });
  }
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    assertSafeJobUrl(body.url);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid URL." },
      { status: 400 },
    );
  }

  try {
    const result = await parseJobLink(body.url);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }

    return NextResponse.json({
      fields: result.fields,
      source: result.source,
      warning: result.warning,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not read that job posting.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
