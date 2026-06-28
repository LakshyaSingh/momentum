"use client";

import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";
import { MomentumGlass } from "@/components/glass/liquid-glass";

export interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  panel?: boolean;
  noGrain?: boolean;
}

export function GlassCard({
  className,
  panel,
  noGrain,
  children,
  ...props
}: GlassCardProps) {
  return (
    <MomentumGlass
      variant={panel ? "panel" : "card"}
      className={cn(
        panel ? "glass-panel" : "glass",
        "native-liquid-glass",
        !noGrain && "grain",
        className,
      )}
      {...props}
    >
      {children}
    </MomentumGlass>
  );
}
