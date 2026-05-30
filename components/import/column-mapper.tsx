"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GlassCard } from "@/components/glass/glass-card";
import { SCHEMA_FIELDS, SCHEMA_LABELS, type SchemaField } from "@/lib/excel";

interface ColumnMapperProps {
  headers: string[];
  mapping: Record<string, SchemaField>;
  onChange: (next: Record<string, SchemaField>) => void;
  sampleByHeader: Record<string, unknown>;
}

export function ColumnMapper({ headers, mapping, onChange, sampleByHeader }: ColumnMapperProps) {
  return (
    <GlassCard className="p-6">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
        Map your columns
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        We made our best guess. Adjust where it&apos;s wrong.
      </p>
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {headers.map((h) => (
          <div key={h} className="space-y-1.5 rounded-xl border border-border/60 bg-background/40 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-medium tracking-tight">{h}</span>
            </div>
            {sampleByHeader[h] !== undefined && (
              <p className="truncate text-xs text-muted-foreground">e.g. {String(sampleByHeader[h])}</p>
            )}
            <Select
              value={mapping[h] ?? "_skip"}
              onValueChange={(v) => onChange({ ...mapping, [h]: v as SchemaField })}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCHEMA_FIELDS.map((f) => (
                  <SelectItem key={f} value={f}>
                    {SCHEMA_LABELS[f]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
