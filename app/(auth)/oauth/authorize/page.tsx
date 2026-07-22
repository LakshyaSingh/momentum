import { redirect } from "next/navigation";
import { GlassCard } from "@/components/glass/glass-card";
import { Button } from "@/components/ui/button";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { getCurrentUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import {
  approveAuthorizationAction,
  denyAuthorizationAction,
} from "./actions";

export const dynamic = "force-dynamic";

const SCOPE_LABELS: Record<string, string> = {
  openid: "Confirm your identity",
  profile: "Read your basic profile",
  email: "Read your email address",
  "momentum:read": "Read your applications and job-search stats",
  "momentum:write": "Create, update, and delete your applications",
};

export default async function AuthorizePage({
  searchParams,
}: {
  searchParams: Promise<{ authorization_id?: string; error?: string }>;
}) {
  const { authorization_id: authorizationId, error } = await searchParams;

  if (!isSupabaseConfigured) {
    return (
      <ConsentShell title="Authorization unavailable">
        <GlassCard className="border-amber-500/20 bg-amber-500/5 p-4 text-sm text-foreground/80">
          Supabase isn&apos;t configured, so the OAuth server is disabled.
        </GlassCard>
      </ConsentShell>
    );
  }

  if (!authorizationId) {
    return (
      <ConsentShell title="Nothing to authorize">
        <GlassCard className="border-red-500/20 bg-red-500/5 p-4 text-sm text-red-600 dark:text-red-400">
          This link is missing an authorization request. Start again from your AI
          client&apos;s connection screen.
        </GlassCard>
      </ConsentShell>
    );
  }

  const user = await getCurrentUser();

  // Not signed in: bounce through Google sign-in and return to this exact URL.
  if (!user) {
    const next = `/oauth/authorize?authorization_id=${encodeURIComponent(authorizationId)}`;
    return (
      <ConsentShell title="Sign in to continue">
        <p className="text-center text-sm text-muted-foreground">
          Sign in to your Momentum account to authorize this connection.
        </p>
        <GlassCard className="p-6 sm:p-8">
          <GoogleSignInButton returnTo="/sign-in" next={next} />
        </GlassCard>
      </ConsentShell>
    );
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return (
      <ConsentShell title="Authorization unavailable">
        <GlassCard className="border-red-500/20 bg-red-500/5 p-4 text-sm text-red-600 dark:text-red-400">
          Could not reach the authorization server. Try again.
        </GlassCard>
      </ConsentShell>
    );
  }

  const { data, error: detailsError } =
    await supabase.auth.oauth.getAuthorizationDetails(authorizationId);

  if (detailsError || !data) {
    return (
      <ConsentShell title="Authorization expired">
        <GlassCard className="border-red-500/20 bg-red-500/5 p-4 text-sm text-red-600 dark:text-red-400">
          {detailsError?.message ??
            "This authorization request is no longer valid. Start again from your AI client."}
        </GlassCard>
      </ConsentShell>
    );
  }

  // Already consented for these scopes — Supabase returns a ready redirect.
  if (!("authorization_id" in data)) {
    redirect(data.redirect_url);
  }

  const clientName = data.client?.name || "An application";
  const scopes = data.scope.split(/\s+/).filter(Boolean);

  return (
    <ConsentShell title="Authorize access">
      <p className="text-center text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{clientName}</span> wants to
        connect to your Momentum account
        <span className="text-foreground/70"> ({user.email})</span>.
      </p>

      {error && (
        <GlassCard className="border-red-500/20 bg-red-500/5 p-4 text-sm text-red-600 dark:text-red-400">
          {error}
        </GlassCard>
      )}

      <GlassCard className="space-y-4 p-6 sm:p-8">
        <p className="text-sm font-medium text-foreground">It will be able to:</p>
        <ul className="space-y-2">
          {scopes.map((scope) => (
            <li key={scope} className="flex items-start gap-2 text-sm text-foreground/80">
              <span aria-hidden className="mt-1 text-emerald-500">
                ✓
              </span>
              <span>{SCOPE_LABELS[scope] ?? scope}</span>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-3 pt-2 sm:flex-row-reverse">
          <form action={approveAuthorizationAction} className="sm:flex-1">
            <input type="hidden" name="authorization_id" value={authorizationId} />
            <Button type="submit" size="lg" className="w-full">
              Authorize
            </Button>
          </form>
          <form action={denyAuthorizationAction} className="sm:flex-1">
            <input type="hidden" name="authorization_id" value={authorizationId} />
            <Button type="submit" size="lg" variant="outline" className="w-full">
              Deny
            </Button>
          </form>
        </div>
      </GlassCard>

      <p className="text-center text-xs text-muted-foreground">
        You can revoke this access anytime from Settings.
      </p>
    </ConsentShell>
  );
}

function ConsentShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-8">
      <div className="space-y-3 text-center">
        <h1 className="text-display-md font-semibold tracking-tight">{title}</h1>
      </div>
      {children}
    </div>
  );
}
