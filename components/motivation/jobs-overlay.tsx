"use client";

import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useMotivationStore } from "@/stores/motivation-store";
import { JOBS_QUOTES } from "@/content/jobs-quotes";

export function JobsOverlay() {
  const current = useMotivationStore((s) => s.current);
  const dismiss = useMotivationStore((s) => s.dismiss);
  const reduce = useReducedMotion();

  const quote = current ? JOBS_QUOTES[current.quoteIdx] : null;

  // Auto-dismiss after 7s.
  useEffect(() => {
    if (!current) return;
    const t = setTimeout(() => dismiss(), 7000);
    return () => clearTimeout(t);
  }, [current, dismiss]);

  // Allow Esc / click anywhere to dismiss
  useEffect(() => {
    if (!current) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") dismiss();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [current, dismiss]);

  return (
    <AnimatePresence>
      {current && quote && (
        <motion.div
          key={current.quoteSeed}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0.15 : 0.5, ease: [0.22, 1, 0.36, 1] }}
          onClick={dismiss}
          className="fixed inset-0 z-[80] flex cursor-pointer items-center justify-center bg-black/40 backdrop-blur-3xl"
          role="dialog"
          aria-modal="true"
          aria-label="Motivation"
        >
          {/* Cinematic gradient backdrop with subtle Ken Burns scale */}
          <motion.div
            className="absolute inset-0 overflow-hidden"
            initial={{ scale: reduce ? 1 : 1.08, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: reduce ? 1 : 1.04, opacity: 0 }}
            transition={{ duration: reduce ? 0.15 : 1.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_30%_20%,#2a2a3e_0%,#15151f_45%,#000_100%)]" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/50 to-black/30" />
            <div className="absolute inset-0 bg-[radial-gradient(closest-side,transparent_30%,rgba(0,0,0,0.55))]" />
          </motion.div>

          {/* Glass frame holding the quote */}
          <motion.div
            initial={{ opacity: 0, y: reduce ? 0 : 20, scale: reduce ? 1 : 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: reduce ? 0 : -10, scale: reduce ? 1 : 0.98 }}
            transition={{ delay: reduce ? 0 : 0.25, duration: reduce ? 0.15 : 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 mx-4 max-w-2xl px-6 text-center"
          >
            <blockquote className="text-balance text-2xl font-medium leading-snug tracking-tight text-white sm:text-3xl md:text-4xl">
              <span className="-ml-3 text-white/40">&ldquo;</span>
              {quote.text}
              <span className="text-white/40">&rdquo;</span>
            </blockquote>
            <p className="mt-8 text-sm font-medium tracking-tight text-white/70">
              — {quote.author}
            </p>
            {quote.source && (
              <p className="mt-1 text-xs text-white/40">{quote.source}</p>
            )}
            <p className="mt-10 text-xs text-white/50">tap anywhere to continue</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
