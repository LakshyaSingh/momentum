import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { isSupabaseConfigured } from "@/lib/env";

type OAuthProvidersProps = {
  returnTo: "/sign-in" | "/sign-up";
};

export function OAuthProviders({ returnTo }: OAuthProvidersProps) {
  if (!isSupabaseConfigured) return null;

  return <GoogleSignInButton returnTo={returnTo} />;
}
