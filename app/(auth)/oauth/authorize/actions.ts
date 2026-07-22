"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Consent decisions for the Supabase OAuth 2.1 server. We pass
 * `skipBrowserRedirect: true` because the browser redirect can't happen on the
 * server — we take the returned `redirect_url` and issue a Next redirect back to
 * the MCP client (with an authorization code on approve, or an error on deny).
 */

async function decide(
  authorizationId: string,
  decision: "approve" | "deny",
): Promise<never> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/sign-in?error=Auth+unavailable");

  const { data, error } =
    decision === "approve"
      ? await supabase.auth.oauth.approveAuthorization(authorizationId, {
          skipBrowserRedirect: true,
        })
      : await supabase.auth.oauth.denyAuthorization(authorizationId, {
          skipBrowserRedirect: true,
        });

  if (error || !data?.redirect_url) {
    redirect(
      `/oauth/authorize?authorization_id=${encodeURIComponent(authorizationId)}&error=${encodeURIComponent(
        error?.message ?? "Could not complete the authorization.",
      )}`,
    );
  }

  redirect(data.redirect_url);
}

export async function approveAuthorizationAction(formData: FormData) {
  const id = String(formData.get("authorization_id") ?? "");
  if (!id) redirect("/oauth/authorize?error=Missing+authorization+id");
  await decide(id, "approve");
}

export async function denyAuthorizationAction(formData: FormData) {
  const id = String(formData.get("authorization_id") ?? "");
  if (!id) redirect("/oauth/authorize?error=Missing+authorization+id");
  await decide(id, "deny");
}
