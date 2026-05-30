import { OAuthProviders } from "@/components/auth/oauth-providers";

export function SignInForm() {
  return <OAuthProviders returnTo="/sign-in" />;
}
