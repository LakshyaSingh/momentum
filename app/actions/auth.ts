"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { resolveSiteUrl } from "@/lib/site-url";

export async function signInWithGoogle(formData: FormData) {
  const returnTo = String(formData.get("returnTo") ?? "/sign-in");
  const safeReturn = returnTo.startsWith("/") ? returnTo : "/sign-in";

  if (!isSupabaseConfigured) {
    redirect(
      `${safeReturn}?error=${encodeURIComponent("Supabase isn't configured. Add credentials to .env.local.")}`,
    );
  }

  const h = await headers();
  const siteUrl = resolveSiteUrl({
    host: h.get("x-forwarded-host") ?? h.get("host"),
    proto: h.get("x-forwarded-proto"),
  });

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    redirect(`${safeReturn}?error=${encodeURIComponent("Auth unavailable")}`);
  }

  const next = String(formData.get("next") ?? "/dashboard");
  const safeNext = next.startsWith("/") ? next : "/dashboard";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${siteUrl}/api/auth/callback?next=${encodeURIComponent(safeNext)}`,
    },
  });

  if (error) {
    redirect(`${safeReturn}?error=${encodeURIComponent(error.message)}`);
  }
  if (data.url) {
    redirect(data.url);
  }

  redirect(`${safeReturn}?error=${encodeURIComponent("Could not start Google sign-in.")}`);
}

export async function signOut() {
  if (isSupabaseConfigured) {
    const supabase = await createSupabaseServerClient();
    if (supabase) await supabase.auth.signOut();
  }
  revalidatePath("/", "layout");
  redirect("/sign-in");
}
