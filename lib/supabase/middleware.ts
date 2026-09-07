import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env, isSupabaseConfigured } from "@/lib/env";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

type MiddlewareSupabaseClient = ReturnType<typeof createServerClient>;

/**
 * Is there a valid session on this request?
 *
 * `getUser()` asks the Auth server every time — ~275ms measured against this
 * project. Middleware runs on very nearly every request, so that one call was
 * the most expensive thing on the path, and it was answering a question the
 * access token already carries. `getClaims()` verifies the token's signature
 * locally with WebCrypto against the project's cached JWKS public key, which
 * measures at 0.5-1ms here. This project signs with ES256, so the local path
 * applies.
 *
 * Refresh still happens, and it has to: middleware is the only place that CAN
 * refresh, because a Server Component's cookie jar is read-only (see the
 * swallowed write in `lib/supabase/server.ts`). Called with no argument,
 * `getClaims()` goes through `getSession()`, which calls `_callRefreshToken()`
 * once the token is within 90s of expiry and persists the new session through
 * the `setAll` handler below.
 *
 * Falls back to `getUser()` when local verification is not possible — a
 * symmetric signing secret, no WebCrypto, or an unreachable JWKS endpoint.
 * Slower, but it fails closed rather than wrong.
 */
async function hasValidSession(supabase: MiddlewareSupabaseClient): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.getClaims();
    if (!error) return Boolean(data?.claims?.sub);
  } catch (err) {
    console.error("middleware getClaims failed, falling back to getUser", err);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  return Boolean(user);
}

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

  const signedIn = await hasValidSession(supabase);

  const isAuthRoute =
    url.pathname.startsWith("/sign-in") || url.pathname.startsWith("/sign-up");
  const isPublic =
    url.pathname === "/" ||
    url.pathname.startsWith("/api/auth") ||
    // OAuth consent page handles its own auth (shows a sign-in prompt when
    // logged out) and must stay reachable by both logged-out and logged-in
    // users, so it must not be force-redirected to "/".
    url.pathname.startsWith("/oauth") ||
    url.pathname.startsWith("/_next") ||
    url.pathname.startsWith("/favicon") ||
    url.pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|css|js)$/);

  if (!signedIn && !isAuthRoute && !isPublic) {
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (signedIn && url.pathname === "/") {
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }
  if (signedIn && isAuthRoute) {
    url.pathname = "/dashboard";
    url.searchParams.delete("next");
    return NextResponse.redirect(url);
  }

  return response;
}
