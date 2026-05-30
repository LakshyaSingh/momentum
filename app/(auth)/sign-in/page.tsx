import Link from "next/link";
import { SignInForm } from "./sign-in-form";
import { GlassCard } from "@/components/glass/glass-card";
import { isSupabaseConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; verified?: string }>;
}) {
  const { error, verified } = await searchParams;

  return (
    <div className="space-y-8">
      <div className="space-y-3 text-center">
        <h1 className="text-display-md font-semibold tracking-tight">Welcome back.</h1>
        <p className="text-base text-muted-foreground">Pick up your momentum.</p>
      </div>

      {verified && (
        <GlassCard className="border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-700 dark:text-emerald-300">
          Your email is confirmed. Sign in with Google to continue.
        </GlassCard>
      )}

      {error && (
        <GlassCard className="border-red-500/20 bg-red-500/5 p-4 text-sm text-red-600 dark:text-red-400">
          {error}
        </GlassCard>
      )}

      <GlassCard className="p-6 sm:p-8">
        <SignInForm />
      </GlassCard>

      <p className="text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link href="/sign-up" className="font-medium text-foreground underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>

      {!isSupabaseConfigured && (
        <GlassCard className="border-amber-500/20 bg-amber-500/5 p-4 text-sm text-foreground/80">
          <p className="font-medium">Demo mode</p>
          <p className="mt-1 text-muted-foreground">
            No Supabase credentials detected. The app is running with a built-in demo user. Go straight to
            <Link href="/dashboard" className="ml-1 underline">/dashboard</Link>.
          </p>
        </GlassCard>
      )}
    </div>
  );
}
