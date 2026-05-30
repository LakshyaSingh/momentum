"use client";

type ChartTooltipProps = {
  label: string;
  value: string;
};

export function ChartTooltip({ label, value }: ChartTooltipProps) {
  return (
    <div className="min-w-[7.5rem] rounded-xl border border-border/70 bg-background/95 px-3.5 py-2.5 shadow-xl backdrop-blur-md dark:border-white/15 dark:bg-zinc-950/95">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-base font-semibold tabular-nums tracking-tight text-foreground">
        {value}
      </p>
    </div>
  );
}

/** Strip default glass tooltip chrome so ChartTooltip provides the readable surface. */
export const chartTooltipContentClassName =
  "border-0 bg-transparent p-0 shadow-none before:hidden backdrop-blur-none";
