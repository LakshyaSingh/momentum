"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/motion/scroll-reveal";

export function LandingHero() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center px-6 pt-16 text-center sm:pt-24">
      <ScrollReveal delay={0}>
        <div className="mb-6 inline-flex items-center gap-2 glass-nav px-3 py-1 text-xs text-muted-foreground">
          <Sparkles className="size-3.5" /> Apply with intention.
        </div>
      </ScrollReveal>
      <ScrollReveal delay={0.08}>
        <h1 className="text-balance text-display-xl font-semibold tracking-tighter sm:text-[5.5rem] sm:leading-[1.02]">
          A job tracker
          <br />
          worth opening.
        </h1>
      </ScrollReveal>
      <ScrollReveal delay={0.16}>
        <p className="mt-6 max-w-xl text-balance text-lg text-muted-foreground sm:text-xl">
          Momentum turns the search into a habit. Track every application,
          build a streak, watch your funnel come alive, and get a quiet word
          of encouragement every time you ship.
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

      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 80, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1.1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative mt-20 w-full"
      >
        <div
          aria-hidden
          className="absolute -inset-x-10 -inset-y-12 rounded-[3rem] bg-gradient-to-b from-violet-500/20 via-blue-500/10 to-transparent blur-3xl"
        />
        <div className="liquid-glass-frame relative">
          <Image
            src="/landing/dashboard.png"
            alt="Momentum dashboard with daily goal ring, streak, and weekly chart"
            width={1024}
            height={766}
            quality={95}
            priority
            className="h-auto w-full"
          />
        </div>
      </motion.div>
    </section>
  );
}
