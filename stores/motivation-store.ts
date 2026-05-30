"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { JOBS_QUOTES, pickQuote } from "@/content/jobs-quotes";

const RECENT_LIMIT = 5;

export interface MotivationTrigger {
  quoteSeed: number;
  /** Resolved once when the overlay opens — avoids re-picking when recent buffers update. */
  quoteIdx: number;
  milestone: number | null;
  streak: number;
}

/** Latest quote shown to the user, persisted so the top quote bar can keep
 *  showing the most recent one across navigation and reloads. */
export interface LatestQuote {
  quoteIdx: number;
  /** Epoch ms of when it was last updated; used as a key to animate swaps. */
  shownAt: number;
}

interface MotivationState {
  /** Currently displayed cinematic — null when nothing is showing. */
  current: MotivationTrigger | null;
  /** Pending celebration to show after the cinematic dismisses. */
  pendingMilestone: { milestone: number; streak: number } | null;
  /** Recently shown quote indices, used to avoid repeats. */
  recentQuotes: number[];
  /** The most recent quote rendered to the user, kept across reloads. */
  latestQuote: LatestQuote | null;

  trigger: (t: Omit<MotivationTrigger, "quoteIdx">) => void;
  dismiss: () => void;
  consumeMilestone: () => void;
}

export const useMotivationStore = create<MotivationState>()(
  persist(
    (set, get) => ({
      current: null,
      pendingMilestone: null,
      recentQuotes: [],
      latestQuote: null,

      trigger: (t) => {
        const { recentQuotes } = get();
        const quote = pickQuote(t.quoteSeed, recentQuotes);
        const quoteIdx = JOBS_QUOTES.findIndex((q) => q.id === quote.id);
        const safeQuoteIdx = quoteIdx >= 0 ? quoteIdx : t.quoteSeed % JOBS_QUOTES.length;

        set({
          current: {
            ...t,
            quoteIdx: safeQuoteIdx,
          },
          pendingMilestone: t.milestone ? { milestone: t.milestone, streak: t.streak } : null,
          recentQuotes: [safeQuoteIdx, ...recentQuotes].slice(0, RECENT_LIMIT),
          latestQuote: { quoteIdx: safeQuoteIdx, shownAt: Date.now() },
        });
      },

      dismiss: () => set({ current: null }),

      consumeMilestone: () => set({ pendingMilestone: null }),
    }),
    {
      name: "momentum-motivation",
      partialize: (s) => ({
        recentQuotes: s.recentQuotes,
        latestQuote: s.latestQuote,
      }),
    },
  ),
);
