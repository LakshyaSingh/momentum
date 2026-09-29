"use client";

import { animate, useMotionValue, useTransform, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";
import { DURATION_REVEAL, DURATION_UPDATE, EASE_OUT } from "@/lib/motion";

export function AnimatedNumber({
  value,
  duration,
  format = (n) => Math.round(n).toString(),
  className,
}: {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const motionValue = useMotionValue(0);
  const display = useTransform(motionValue, (latest) => format(latest));
  const reduce = useReducedMotion();
  const revealed = useRef(false);

  useEffect(() => {
    if (reduce) {
      motionValue.set(value);
      return;
    }
    const controls = animate(motionValue, value, {
      duration: duration ?? (revealed.current ? DURATION_UPDATE : DURATION_REVEAL),
      ease: EASE_OUT,
    });
    revealed.current = true;
    return () => controls.stop();
  }, [value, duration, motionValue, reduce]);

  return <motion.span className={className}>{display}</motion.span>;
}
