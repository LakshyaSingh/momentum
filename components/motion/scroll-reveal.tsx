"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { type ReactNode } from "react";
import { DURATION_AMBIENT, EASE_OUT } from "@/lib/motion";

type ScrollRevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  /** How far the element travels in (px). Default 16. */
  distance?: number;
  /** "up" — flies up from below (default). "down" — drops in. "left"/"right" — slides. */
  direction?: "up" | "down" | "left" | "right";
  /** Tag the wrapper renders. Default "div". */
  as?: "div" | "section" | "header" | "li" | "p" | "span";
  /** Fraction of element that must be visible to trigger. Default 0 (any pixel). */
  amount?: number;
};

/**
 * Apple-style scroll reveal. Plays in when the element enters the viewport
 * and reverses on exit so scrolling back up replays the moment.
 *
 * The IntersectionObserver root margin is widened generously on the TOP
 * (400px). Without that buffer, the trigger threshold sits exactly at the
 * viewport edge — and iOS Safari's rubber-band scroll repeatedly crosses
 * the edge as the user reaches the bottom of the page, causing a fade
 * in/out flicker on the last visible element. The widened top margin
 * absorbs any reasonable overscroll (max ~200–250px on iOS) while keeping
 * the entry threshold (bottom margin) at the real viewport edge, so
 * scrolling back up far enough still replays the animation cleanly.
 *
 * Uses amount=0 by default so tall blocks (e.g. application tables) still
 * animate — requiring 20% of a multi-thousand-pixel node never fires.
 */
export function ScrollReveal({
  children,
  className,
  delay = 0,
  distance = 16,
  direction = "up",
  as = "div",
  amount = 0,
}: ScrollRevealProps) {
  const prefersReducedMotion = useReducedMotion();

  const offset = (() => {
    switch (direction) {
      case "up":
        return { x: 0, y: distance };
      case "down":
        return { x: 0, y: -distance };
      case "left":
        return { x: distance, y: 0 };
      case "right":
        return { x: -distance, y: 0 };
    }
  })();

  const variants: Variants = prefersReducedMotion
    ? {
        hidden: { opacity: 1, x: 0, y: 0 },
        visible: { opacity: 1, x: 0, y: 0 },
      }
    : {
        hidden: { opacity: 0, x: offset.x, y: offset.y },
        visible: {
          opacity: 1,
          x: 0,
          y: 0,
          transition: {
            /*
             * This wrapper is on every authenticated page, and it replays each
             * time an element scrolls back into view, so the same motion is
             * seen dozens of times a day. At that frequency the budget is
             * near-imperceptible: a short settle that softens the arrival,
             * not a slide the user waits through. It was 750ms over 32px.
             */
            duration: DURATION_AMBIENT,
            delay,
            ease: EASE_OUT,
          },
        },
      };

  const MotionTag = motion[as];

  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="visible"
      exit="hidden"
      viewport={{ once: false, amount, margin: "400px 0px -5% 0px" }}
      variants={variants}
    >
      {children}
    </MotionTag>
  );
}
