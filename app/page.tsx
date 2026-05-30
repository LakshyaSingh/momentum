import Link from "next/link";
import { AmbientBackground } from "@/components/glass/ambient-background";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { LandingHero } from "@/components/landing/landing-hero";
import { FeatureRow } from "@/components/landing/feature-row";
import { ClosingCta } from "@/components/landing/closing-cta";

export default function MarketingPage() {
  return (
    <div className="relative min-h-svh overflow-hidden">
      <AmbientBackground />

      <header className="glass-bar sticky top-0 z-30 flex items-center justify-between px-6 py-4 sm:px-10">
        <div className="text-sm font-semibold tracking-tight">Momentum</div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm">
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/sign-up">Get started</Link>
          </Button>
        </div>
      </header>

      <main className="relative z-10">
        <LandingHero />

        <FeatureRow
          eyebrow="Auto-fill"
          title="Paste a link. Skip the typing."
          description="Drop in any job posting from Greenhouse, LinkedIn, Lever, Workday, or a company careers page. Momentum reads the page and fills the role, company, location, salary, recruiter, and notes. Logging an application takes seconds, not minutes."
          imageSrc="/landing/auto-fill.png"
          imageAlt="New application sheet with role, company, location, and salary auto-filled from a pasted job link"
          accent="fuchsia"
          reverse
        />

        <FeatureRow
          eyebrow="Home"
          title="Your day, in focus."
          description="One ring. One streak. One number that matters most: today. Open Momentum and the only thing you see is what you came to do."
          imageSrc="/landing/dashboard.jpg"
          imageAlt="Dashboard showing daily goal ring, current streak, and weekly chart"
          accent="emerald"
        />

        <FeatureRow
          eyebrow="Applications"
          title="Every application. One place."
          description="Search, filter, sort. From the first cold email to the final offer, all on one Liquid Glass surface. Built for thousands of rows, designed to feel like ten."
          imageSrc="/landing/applications.jpg"
          imageAlt="Applications table with search, status filters, and 1407 applications"
          accent="blue"
          reverse
        />

        <FeatureRow
          eyebrow="Analytics"
          title="Patterns hide in your data."
          description="We surface them. Volume over time, response rate, the funnel from applied to offer. Read like a story, not a spreadsheet."
          imageSrc="/landing/analytics.jpg"
          imageAlt="Analytics view with applications-over-time chart and funnel"
          accent="violet"
        />

        <FeatureRow
          eyebrow="Consistency"
          title="Show up. Every day."
          description="A year of effort, in a single grid. Watch your longest streak grow, your best day climb, your worst day fade. The job is hard. The habit shouldn't be."
          imageSrc="/landing/calendar.jpg"
          imageAlt="Calendar heatmap with 20-day streak and 117-day longest streak"
          accent="amber"
          reverse
        />

        <FeatureRow
          eyebrow="Import"
          title="Bring your history with you."
          description="Drop in any spreadsheet: Excel, Numbers, Sheets, CSV. We guess the columns, you confirm, then everything snaps into Momentum."
          imageSrc="/landing/import.jpg"
          imageAlt="Import page with drag-and-drop spreadsheet zone"
          accent="rose"
        />

        <ClosingCta />
      </main>

      <footer className="relative z-10 border-t border-border/40 px-6 py-10 text-center text-xs text-muted-foreground">
        Built for ambitious people. Keep applying, keep going.
      </footer>
    </div>
  );
}
