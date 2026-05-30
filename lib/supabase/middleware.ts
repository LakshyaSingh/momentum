import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env, isSupabaseConfigured } from "@/lib/env";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/**
 * Refresh the Supabase session cookie on every request and gate protected routes.
 * If Supabase isn't configured, we simply pass through (demo mode).
 */
export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({ request });
  const url = request.nextUrl.clone();

  if (!isSupabaseConfigured) {
    if (url.pathname === "/") {
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
    return response;
  }

  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute =
    url.pathname.startsWith("/sign-in") || url.pathname.startsWith("/sign-up");
  const isPublic =
    url.pathname === "/" ||
    url.pathname.startsWith("/api/auth") ||
    url.pathname.startsWith("/_next") ||
    url.pathname.startsWith("/favicon") ||
    url.pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|css|js)$/);

  if (!user && !isAuthRoute && !isPublic) {
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (user && url.pathname === "/") {
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }
  if (user && isAuthRoute) {
    url.pathname = "/dashboard";
    url.searchParams.delete("next");
    return NextResponse.redirect(url);
  }

  return response;
}
