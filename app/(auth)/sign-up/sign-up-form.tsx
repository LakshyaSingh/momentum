import { OAuthProviders } from "@/components/auth/oauth-providers";

export function SignUpForm() {
  return <OAuthProviders returnTo="/sign-up" />;
}
