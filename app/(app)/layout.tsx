import { requireUser } from "@/lib/auth";
import { AppBackground } from "@/components/glass/app-background";
import { FloatingNav } from "@/components/nav/floating-nav";
import { MotivationStage } from "@/components/motivation/motivation-stage";
import { JobsQuoteBar } from "@/components/motivation/jobs-quote-bar";
import { TimezoneSync } from "@/components/settings/timezone-sync";
import { StatsPrefetch } from "@/components/nav/stats-prefetch";
import { DeclarativeGlassSceneProvider } from "@/components/glass/declarative-glass-scene";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="app-shell relative isolate min-h-svh bg-background dark:bg-black">
      <DeclarativeGlassSceneProvider>
        <TimezoneSync timezone={user.timezone} />
        <StatsPrefetch />
        <AppBackground />
        <FloatingNav user={user} />
        <JobsQuoteBar />
        <main className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-32 pt-36 sm:px-6 md:pt-40 lg:px-8">
          {children}
        </main>
        <MotivationStage />
      </DeclarativeGlassSceneProvider>
    </div>
  );
}
