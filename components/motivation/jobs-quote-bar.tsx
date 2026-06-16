"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useMotivationStore } from "@/stores/motivation-store";
import { JOBS_QUOTES } from "@/content/jobs-quotes";

// Seed value used before the user has logged their first application. We show
// a strong opening line so the bar has presence on a fresh account.
const DEFAULT_QUOTE_IDX = Math.max(
  0,
  JOBS_QUOTES.findIndex((q) => q.id === 1),
);

/**
 * Persistent glass quote strip rendered inside the authenticated layout.
 *
 * Reads `latestQuote` from the motivation store (which the cinematic overlay
 * updates whenever a new application is logged), so the quote shown here always
 * matches the most recent line of encouragement the user saw.
 *
 * On a fresh account `latestQuote` is null, so we fall back to the default
 * seed above.
 */
export function JobsQuoteBar() {
  const latestQuote = useMotivationStore((s) => s.latestQuote);
  const reduce = useReducedMotion();

  // Avoid hydration mismatch: zustand's persist middleware reads from
  // localStorage on the client, so the server render and the first client
  // render can disagree about `latestQuote`. Wait for mount before painting.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div aria-hidden className="h-12 sm:h-14" />;
  }

  const quoteIdx = latestQuote?.quoteIdx ?? DEFAULT_QUOTE_IDX;
  const quote = JOBS_QUOTES[quoteIdx] ?? JOBS_QUOTES[DEFAULT_QUOTE_IDX]!;

  // The swap key drives the AnimatePresence transition: any time the user
  // logs an application the overlay sets a new `shownAt`, which fades the
  // bar's contents to the new quote.
  const swapKey = latestQuote ? `${latestQuote.shownAt}-${quoteIdx}` : "default";

  return (
    <div className="pointer-events-none fixed inset-x-0 top-16 z-30 flex justify-center px-3 md:top-20">
      <AnimatePresence mode="wait">
        <motion.div
          key={swapKey}
          initial={{ opacity: 0, y: reduce ? 0 : -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduce ? 0 : -8 }}
          transition={{ duration: reduce ? 0.15 : 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-auto flex w-full max-w-2xl items-center gap-4 rounded-full glass-nav px-5 py-2 sm:px-6"
          aria-label={`Quote from ${quote.author}: ${quote.text}`}
        >
          <p className="line-clamp-2 flex-1 text-center text-[12px] italic leading-snug text-foreground/85 sm:text-left sm:text-sm">
            <span className="text-muted-foreground/60">&ldquo;</span>
            {quote.text}
            <span className="text-muted-foreground/60">&rdquo;</span>
          </p>
          <span className="hidden shrink-0 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground sm:inline-block">
            {quote.author}
          </span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
