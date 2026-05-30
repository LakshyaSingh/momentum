import { type NextRequest } from "next/server";
import { completeAuthCallback } from "@/lib/supabase/auth-callback";

export async function GET(request: NextRequest) {
  return completeAuthCallback(request, { defaultNext: "/dashboard" });
}
