"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { cn } from "@/lib/utils";

type FeatureRowProps = {
  eyebrow: string;
  title: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
  /** Reverse order so the screenshot lands on the left on desktop. */
  reverse?: boolean;
  /** Optional accent gradient behind the screenshot. */
  accent?: "blue" | "violet" | "amber" | "emerald" | "rose" | "fuchsia";
};

const ACCENTS: Record<NonNullable<FeatureRowProps["accent"]>, string> = {
  blue: "from-sky-500/30 via-blue-500/10 to-transparent",
  violet: "from-violet-500/30 via-fuchsia-500/10 to-transparent",
  amber: "from-amber-400/30 via-orange-500/10 to-transparent",
  emerald: "from-emerald-400/30 via-teal-500/10 to-transparent",
  rose: "from-rose-400/30 via-pink-500/10 to-transparent",
  fuchsia: "from-fuchsia-500/30 via-purple-500/10 to-transparent",
};

export function FeatureRow({
  eyebrow,
  title,
  description,
  imageSrc,
  imageAlt,
  reverse = false,
  accent = "blue",
}: FeatureRowProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="relative mx-auto w-full max-w-6xl px-6 py-24 sm:py-32">
      <div
        className={cn(
          "grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-16",
          reverse && "lg:[&>*:first-child]:order-2",
        )}
      >
        <div className="lg:col-span-5">
          <ScrollReveal delay={0} distance={32}>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {eyebrow}
            </p>
          </ScrollReveal>
          <ScrollReveal delay={0.05}>
            <h2 className="mt-4 text-balance text-display-lg font-semibold tracking-tighter">
              {title}
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <p className="mt-5 max-w-md text-balance text-lg leading-relaxed text-muted-foreground">
              {description}
            </p>
          </ScrollReveal>
        </div>

        <div className="lg:col-span-7">
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 60, scale: 0.96 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, y: 60, scale: 0.96 }}
            viewport={{ once: false, amount: 0.2, margin: "400px 0px -10% 0px" }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <div
              aria-hidden
              className={cn(
                "absolute -inset-8 rounded-[2.5rem] bg-gradient-to-br opacity-80 blur-3xl",
                ACCENTS[accent],
              )}
            />
            <div className="liquid-glass-frame relative">
              <Image
                src={imageSrc}
                alt={imageAlt}
                width={1024}
                height={766}
                quality={92}
                priority={false}
                className="h-auto w-full"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
