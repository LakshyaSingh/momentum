"use client";

import { SegmentedControl } from "@/components/segmented-control";
import type { ApplicationsTab } from "@/lib/applications-list";

type ApplicationsTabsProps = {
  value: ApplicationsTab;
  onChange: (tab: ApplicationsTab) => void;
  queuedCount: number;
};

/**
 * Presentational only. Switching lists is handled entirely in the browser by
 * ApplicationsTabsView — routing here would cost a full RSC round-trip
 * (Supabase auth + counts + list query) on every click.
 */
export function ApplicationsTabs({ value, onChange, queuedCount }: ApplicationsTabsProps) {
  const options = [
    { value: "applications" as const, label: "Applied" },
    {
      value: "queue" as const,
      label: queuedCount > 0 ? `To apply · ${queuedCount}` : "To apply",
    },
  ];

  return (
    <SegmentedControl
      value={value}
      onChange={onChange}
      options={options}
      layoutId="applications-tab"
    />
  );
}
