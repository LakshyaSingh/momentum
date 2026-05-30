import { cn } from "@/lib/utils";
import { forwardRef, type HTMLAttributes } from "react";

export interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  panel?: boolean;
  noGrain?: boolean;
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, panel, noGrain, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(panel ? "glass-panel" : "glass", !noGrain && "grain", className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);
GlassCard.displayName = "GlassCard";
