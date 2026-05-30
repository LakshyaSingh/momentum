"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SegmentedControl } from "@/components/segmented-control";
import {
  buildSeries,
  topCompanies,
  TIME_RANGE_OPTIONS,
  type TimeRange,
} from "@/lib/analytics";
import { ApplicationsOverTime } from "./applications-over-time";
import { TopCompanies } from "./top-companies";
import { FunnelChart } from "./funnel-chart";
import { ProductivityCards } from "./productivity-cards";
import type { FunnelStage, ProductivityStats } from "@/lib/analytics";
import type { ApplicationStatus } from "@prisma/client";

interface AnalyticsClientProps {
  /** Raw applications transferred to the client; we filter & bucket here so toggles are instant. */
  applications: { id: string; applicationDate: string; company: string; status: ApplicationStatus }[];
  funnel: FunnelStage[];
  productivity: ProductivityStats;
}

export function AnalyticsClient({ applications, funnel, productivity }: AnalyticsClientProps) {
  const [range, setRange] = useState<TimeRange>("30d");

  const dataInRange = useMemo(() => {
    return applications.map((a) => ({ applicationDate: new Date(a.applicationDate), company: a.company, status: a.status }));
  }, [applications]);

  const series = useMemo(() => buildSeries(dataInRange, range), [dataInRange, range]);
  const top = useMemo(() => topCompanies(dataInRange), [dataInRange]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="sr-only">Analytics</h2>
        <SegmentedControl
          value={range}
          onChange={setRange}
          options={TIME_RANGE_OPTIONS}
          layoutId="analytics-range"
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={range}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-6"
        >
          <ApplicationsOverTime data={series} range={rangeLabel(range)} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <FunnelChart stages={funnel} />
            <TopCompanies rows={top} />
          </div>

          <ProductivityCards stats={productivity} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function rangeLabel(r: TimeRange) {
  switch (r) {
    case "7d": return "the last 7 days";
    case "30d": return "the last 30 days";
    case "6mo": return "the last 6 months";
    case "1yr": return "the last year";
    case "all": return "all time";
  }
}
