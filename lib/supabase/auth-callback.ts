import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { env, isSupabaseConfigured } from "@/lib/env";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

const OTP_TYPES = new Set<EmailOtpType>([
  "signup",
  "email",
  "recovery",
  "invite",
  "magiclink",
  "email_change",
]);

function safeNextPath(nextParam: string | null, defaultNext: string) {
  const next = nextParam ?? defaultNext;
  return next.startsWith("/") ? next : defaultNext;
}

function redirectToSignIn(
  request: NextRequest,
  opts: { error?: string; verified?: boolean; recovery?: boolean },
) {
  const signIn = request.nextUrl.clone();
  signIn.pathname = opts.recovery ? "/forgot-password" : "/sign-in";
  signIn.search = "";
  if (opts.verified) {
    signIn.searchParams.set("verified", "1");
  } else if (opts.error) {
    signIn.searchParams.set("error", opts.error);
  }
  return NextResponse.redirect(signIn);
}

function isPkceVerifierError(message: string) {
  return /code challenge|code verifier|both auth code and code verifier/i.test(message);
}

function createCallbackClient(request: NextRequest, response: NextResponse) {
  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });
}

type AuthCallbackOptions = {
  /** Where to send the user after a successful exchange. */
  defaultNext: string;
  /** Password-reset links should not fall back to the sign-in "verified" UX. */
  isRecovery?: boolean;
};

export async function completeAuthCallback(
  request: NextRequest,
  { defaultNext, isRecovery = false }: AuthCallbackOptions,
): Promise<NextResponse> {
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const typeParam = request.nextUrl.searchParams.get("type");
  const type =
    typeParam && OTP_TYPES.has(typeParam as EmailOtpType)
      ? (typeParam as EmailOtpType)
      : null;

  const recoveryFlow = isRecovery || type === "recovery";
  const safeNext =
    recoveryFlow ? "/reset-password" : safeNextPath(request.nextUrl.searchParams.get("next"), defaultNext);

  if (!isSupabaseConfigured) {
    return redirectToSignIn(request, {
      error: recoveryFlow
        ? "Could not verify your reset link. Request a new one."
        : "Could not verify your email. Try signing in.",
      recovery: recoveryFlow,
    });
  }

  if (!code && !tokenHash) {
    return redirectToSignIn(request, {
      error: recoveryFlow
        ? "Could not verify your reset link. Request a new one."
        : "Could not verify your email. Try signing in.",
      recovery: recoveryFlow,
    });
  }

  const redirectTarget = request.nextUrl.clone();
  redirectTarget.pathname = safeNext;
  redirectTarget.search = "";
  const response = NextResponse.redirect(redirectTarget);

  const supabase = createCallbackClient(request, response);

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return response;
    }
    if (code) {
      // Fall through and try PKCE exchange if both params are present.
    } else if (isPkceVerifierError(error.message)) {
      return redirectToSignIn(request, {
        verified: !recoveryFlow,
        error: recoveryFlow
          ? "Reset link opened in a different browser. Request a new link and open it in the same browser, or try again from Forgot password."
          : undefined,
        recovery: recoveryFlow,
      });
    } else {
      return redirectToSignIn(request, { error: error.message, recovery: recoveryFlow });
    }
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return response;
    }
    if (isPkceVerifierError(error.message)) {
      return redirectToSignIn(request, {
        verified: !recoveryFlow,
        error: recoveryFlow
          ? "Reset link opened in a different browser. Request a new link and open it in the same browser, or try again from Forgot password."
          : undefined,
        recovery: recoveryFlow,
      });
    }
    return redirectToSignIn(request, { error: error.message, recovery: recoveryFlow });
  }

  return redirectToSignIn(request, {
    error: recoveryFlow
      ? "Could not verify your reset link. Request a new one."
      : "Could not verify your email. Try signing in.",
    recovery: recoveryFlow,
  });
}
