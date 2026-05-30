"use client";

import { motion, useReducedMotion } from "framer-motion";
import { clamp } from "@/lib/utils";

interface ProgressRingProps {
  /** Value in 0..max */
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  trackClass?: string;
  fillClass?: string;
  /** If `extra` is passed, we layer a second arc on top to indicate streak overflow */
  extra?: { value: number; fillClass?: string };
  children?: React.ReactNode;
  ariaLabel?: string;
}

export function ProgressRing({
  value,
  max,
  size = 200,
  stroke = 14,
  trackClass = "stroke-foreground/10",
  fillClass = "stroke-foreground",
  children,
  ariaLabel,
}: ProgressRingProps) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const fraction = clamp(value / Math.max(1, max), 0, 1);
  const offset = circumference * (1 - fraction);
  const reduce = useReducedMotion();

  return (
    <div className="relative inline-flex" style={{ width: size, height: size }} role="img" aria-label={ariaLabel}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className={trackClass}
          strokeLinecap="round"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className={fillClass}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: reduce ? 0 : 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  );
}
