import Link from "next/link";
import { AppBackground } from "@/components/glass/app-background";
import { AuthAmbient } from "@/components/glass/auth-ambient";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-shell relative isolate min-h-svh overflow-hidden bg-background dark:bg-black">
      <AppBackground />
      <AuthAmbient />
      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
        <Link href="/" className="text-sm font-medium tracking-tight text-foreground/80 hover:text-foreground">
          ← Momentum
        </Link>
      </header>
      <main className="relative z-10 mx-auto flex w-full max-w-md flex-col px-6 pb-16 pt-8 sm:pt-16">
        {children}
      </main>
    </div>
  );
}
