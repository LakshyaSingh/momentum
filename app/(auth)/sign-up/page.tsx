import Link from "next/link";
import { SignUpForm } from "./sign-up-form";
import { GlassCard } from "@/components/glass/glass-card";

export const dynamic = "force-dynamic";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="space-y-8">
      <div className="space-y-3 text-center">
        <h1 className="text-display-md font-semibold tracking-tight">Build your momentum.</h1>
        <p className="text-base text-muted-foreground">Track every application. Earn every day.</p>
      </div>

      {error && (
        <GlassCard className="border-red-500/20 bg-red-500/5 p-4 text-sm text-red-600 dark:text-red-400">
          {error}
        </GlassCard>
      )}

      <GlassCard className="p-6 sm:p-8">
        <SignUpForm />
      </GlassCard>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-foreground underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
