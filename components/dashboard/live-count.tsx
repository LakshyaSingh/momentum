"use client";

import { AnimatedNumber } from "./animated-number";
import { usePendingCount } from "@/components/applications/optimistic-applications";

/**
 * A server-rendered application count plus any creates still in flight, so a
 * new application moves the dashboard numbers the moment it is submitted.
 */
export function LiveCount({
  value,
  scope,
  unit,
  animated = true,
  className,
  labelClassName,
}: {
  value: number;
  scope: "today" | "week" | "all";
  unit?: [singular: string, plural: string];
  animated?: boolean;
  className?: string;
  labelClassName?: string;
}) {
  const count = value + usePendingCount(scope);
  const label = unit ? (count === 1 ? unit[0] : unit[1]) : null;
  return (
    <>
      {animated ? <AnimatedNumber value={count} className={className} /> : <span className={className}>{count}</span>}
      {label && <span className={labelClassName}>{label}</span>}
    </>
  );
}
