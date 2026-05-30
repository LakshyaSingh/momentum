"use client";

import { animate, useMotionValue, useTransform, motion, useReducedMotion } from "framer-motion";
import { useEffect } from "react";

export function AnimatedNumber({
  value,
  duration = 1.1,
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

  useEffect(() => {
    if (reduce) {
      motionValue.set(value);
      return;
    }
    const controls = animate(motionValue, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
    });
    return () => controls.stop();
  }, [value, duration, motionValue, reduce]);

  return <motion.span className={className}>{display}</motion.span>;
}
