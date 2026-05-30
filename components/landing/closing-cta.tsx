"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/motion/scroll-reveal";

export function ClosingCta() {
  return (
    <section className="relative mx-auto w-full max-w-4xl px-6 py-32 text-center sm:py-40">
      <ScrollReveal>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Today
        </p>
      </ScrollReveal>
      <ScrollReveal delay={0.08}>
        <h2 className="mt-4 text-balance text-display-xl font-semibold tracking-tighter">
          Today is a good day
          <br />
          to apply.
        </h2>
      </ScrollReveal>
      <ScrollReveal delay={0.16}>
        <p className="mx-auto mt-6 max-w-lg text-balance text-lg text-muted-foreground">
          Free to start. Yours forever. The only thing standing between you and the
          offer is one more application.
        </p>
      </ScrollReveal>
      <ScrollReveal delay={0.24}>
        <div className="mt-10 flex items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/sign-up">
              Start your streak <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="glass" size="lg">
            <Link href="/sign-in">Sign in</Link>
          </Button>
        </div>
      </ScrollReveal>
    </section>
  );
}
