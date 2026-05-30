"use client";

import { motion, LayoutGroup } from "framer-motion";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: readonly SegmentedOption<T>[];
  layoutId?: string;
  className?: string;
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  layoutId = "segmented-active",
  className,
}: SegmentedControlProps<T>) {
  return (
    <LayoutGroup id={layoutId}>
      <div className={cn("inline-flex glass-nav p-1", className)}>
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              aria-pressed={active}
              className={cn(
                "relative inline-flex items-center justify-center rounded-full px-4 py-1.5 text-sm font-medium tracking-tight transition-colors duration-150",
                active ? "text-background" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {active && (
                <motion.span
                  layoutId={`${layoutId}-thumb`}
                  className="absolute inset-0 rounded-full bg-foreground"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <span className="relative z-10">{opt.label}</span>
            </button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}
