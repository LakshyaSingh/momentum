"use client";

import { useEffect, useMemo, useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/glass/glass-card";
import { UploadDropzone } from "./upload-dropzone";
import { ColumnMapper } from "./column-mapper";
import { ImportPreview } from "./import-preview";
import {
  EXCEL_ROW_KEY,
  LINK_PREFIX,
  SHEET_KEY,
  mergeImportRow,
  normalizeRow,
  suggestMapping,
  type DateFormat,
  type NormalizedRow,
  type SchemaField,
} from "@/lib/excel";
import { importApplications, type ImportRowInput } from "@/app/actions/import";

type Stage = "idle" | "preview";

export function ImportClient() {
  const [stage, setStage] = useState<Stage>("idle");
  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([]);
  const [mapping, setMapping] = useState<Record<string, SchemaField>>({});
  const [enabledSheets, setEnabledSheets] = useState<Record<string, boolean>>({});
  const [dateFormat, setDateFormat] = useState<DateFormat>("DDMM");
  const [manualFixes, setManualFixes] = useState<Record<number, Partial<NormalizedRow>>>({});
  const [pending, start] = useTransition();
  const router = useRouter();

  async function handleFile(file: File) {
    setFileName(file.name);
    try {
      const ext = file.name.toLowerCase().split(".").pop();
      let result: { headers: string[]; rows: Record<string, unknown>[] };
      if (ext === "csv") {
        result = await parseCsv(file);
      } else {
        result = await parseXlsx(file);
      }
      if (result.rows.length === 0) {
        toast.error("No data rows found in this file.");
        return;
      }
      setHeaders(result.headers);
      setRawRows(
        result.rows.map((row, i) => ({
          ...row,
          [EXCEL_ROW_KEY]: typeof row[EXCEL_ROW_KEY] === "number" ? row[EXCEL_ROW_KEY] : i + 2,
        })),
      );
      setMapping(suggestMapping(result.headers));
      setManualFixes({});
      // Default: every sheet enabled.
      const sheetMap: Record<string, boolean> = {};
      for (const r of result.rows) {
        const s = r[SHEET_KEY];
        if (typeof s === "string" && !(s in sheetMap)) sheetMap[s] = true;
      }
      setEnabledSheets(sheetMap);
      setStage("preview");
    } catch (err) {
      console.error(err);
      toast.error("Couldn't parse that file.");
    }
  }

  // Per-sheet row counts (raw, before validation).
  const sheetCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of rawRows) {
      const s = (r[SHEET_KEY] as string) ?? "";
      counts[s] = (counts[s] ?? 0) + 1;
    }
    return counts;
  }, [rawRows]);

  // Filter raw rows to only those whose sheet is enabled.
  const filteredRaw = useMemo(() => {
    if (Object.keys(enabledSheets).length === 0) return rawRows;
    return rawRows.filter((r) => {
      const s = r[SHEET_KEY];
      if (typeof s !== "string") return true;
      return enabledSheets[s] !== false;
    });
  }, [rawRows, enabledSheets]);

  const normalized: NormalizedRow[] = useMemo(() => {
    if (stage !== "preview") return [];
    return filteredRaw.map((r, i) => {
      const row = normalizeRow(r, mapping, dateFormat);
      return {
        ...row,
        _sourceIndex: i,
        _excelRow: typeof r[EXCEL_ROW_KEY] === "number" ? (r[EXCEL_ROW_KEY] as number) : undefined,
        _sheet: typeof r[SHEET_KEY] === "string" ? r[SHEET_KEY] : undefined,
      };
    });
  }, [filteredRaw, mapping, stage, dateFormat]);

  const displayRows = useMemo(() => {
    return normalized.map((row) => {
      const patch = manualFixes[row._sourceIndex];
      return patch ? mergeImportRow(row, patch) : row;
    });
  }, [normalized, manualFixes]);

  const validRows = displayRows.filter((r) => r._errors.length === 0);
  const issueRows = displayRows.filter((r) => r._errors.length > 0);

  const updateRow = useCallback((sourceIndex: number, patch: Partial<NormalizedRow>) => {
    setManualFixes((prev) => ({
      ...prev,
      [sourceIndex]: { ...prev[sourceIndex], ...patch },
    }));
  }, []);

  // Column mapping / date interpretation changes re-parse rows from scratch.
  useEffect(() => {
    setManualFixes({});
  }, [mapping, dateFormat, rawRows]);

  function toggleSheet(name: string) {
    setEnabledSheets((prev) => ({ ...prev, [name]: !prev[name] }));
  }

  function reset() {
    setStage("idle");
    setHeaders([]);
    setRawRows([]);
    setMapping({});
    setEnabledSheets({});
    setManualFixes({});
    setFileName(null);
  }

  function commit() {
    const payload: ImportRowInput[] = validRows.map((r) => ({
      company: r.company,
      role: r.role,
      location: r.location,
      jobLink: r.jobLink,
      applicationDate: (r.applicationDate ?? new Date()).toISOString(),
      status: r.status,
      salary: r.salary,
      recruiter: r.recruiter,
      referral: r.referral,
      notes: r.notes,
      followUpDate: r.followUpDate ? r.followUpDate.toISOString() : undefined,
      interviewStage: r.interviewStage,
      offerStatus: r.offerStatus,
    }));

    start(async () => {
      const res = await importApplications(payload);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(
        res.skipped > 0
          ? `Imported ${res.inserted} · skipped ${res.skipped}`
          : `Imported ${res.inserted} application${res.inserted === 1 ? "" : "s"}`,
      );
      router.push("/applications");
    });
  }

  if (stage === "idle") {
    return (
      <div className="space-y-8">
        <UploadDropzone onFile={handleFile} />

        <GlassCard className="p-6">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 size-4 text-foreground/70" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground/90">Tips for the cleanest import</p>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                <li>Headers in the first row (Company, Role, Date, Status, …).</li>
                <li>Dates in any common format. We&apos;ll figure it out.</li>
                <li>Status names like &quot;Applied&quot;, &quot;Interview&quot;, &quot;Offer&quot; map automatically.</li>
              </ul>
            </div>
          </div>
        </GlassCard>
      </div>
    );
  }

  const sampleByHeader: Record<string, unknown> = {};
  for (const h of headers) {
    const sample = rawRows.find((r) => r[h] !== undefined && r[h] !== null && r[h] !== "");
    if (sample) sampleByHeader[h] = sample[h];
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={reset}>
          <ArrowLeft className="size-4" /> Pick another file
        </Button>
        {fileName && (
          <span className="truncate text-xs text-muted-foreground">{fileName}</span>
        )}
      </div>

      <GlassCard className="p-5">
        <div className="flex flex-wrap items-start gap-6">
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Date format
            </p>
            <p className="text-sm text-muted-foreground">
              How dates like <code className="rounded bg-foreground/[0.06] px-1.5 py-0.5 font-mono text-[11px]">5/12/26</code> should be read.
            </p>
          </div>
          <div className="inline-flex rounded-full border border-border/60 bg-foreground/[0.03] p-1 text-xs">
            {(
              [
                { id: "DDMM", label: "DD/MM/YY", hint: "5 May → day=5, month=12 → Dec 5" },
                { id: "MMDD", label: "MM/DD/YY", hint: "5 May → month=5, day=12 → May 12" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setDateFormat(opt.id)}
                aria-pressed={dateFormat === opt.id}
                title={opt.hint}
                className={
                  "rounded-full px-3 py-1.5 font-medium transition-colors " +
                  (dateFormat === opt.id
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </GlassCard>

      {Object.keys(sheetCounts).length > 1 && (
        <GlassCard className="p-5">
          <div className="flex flex-wrap items-start gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Sheets in this workbook
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Toggle off any sheet you don&apos;t want to import.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(sheetCounts).map(([name, count]) => {
                const enabled = enabledSheets[name] !== false;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => toggleSheet(name)}
                    className={
                      "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
                      (enabled
                        ? "border-foreground/20 bg-foreground/[0.06] text-foreground"
                        : "border-border/60 bg-transparent text-muted-foreground hover:text-foreground")
                    }
                    aria-pressed={enabled}
                  >
                    <span
                      className={
                        "size-1.5 rounded-full " +
                        (enabled ? "bg-emerald-500" : "bg-muted-foreground/40")
                      }
                    />
                    {name}
                    <span className="text-muted-foreground">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </GlassCard>
      )}

      <ColumnMapper
        headers={headers}
        mapping={mapping}
        onChange={setMapping}
        sampleByHeader={sampleByHeader}
      />

      <ImportPreview rows={displayRows} onUpdateRow={updateRow} />

      <div className="flex flex-wrap items-center justify-end gap-3">
        <p className="mr-auto text-xs text-muted-foreground">
          {validRows.length} of {displayRows.length} row{displayRows.length === 1 ? "" : "s"} ready
          to import.
          {issueRows.length > 0 &&
            ` ${issueRows.length} still need${issueRows.length === 1 ? "s" : ""} attention.`}
        </p>
        <Button variant="ghost" onClick={reset} disabled={pending}>Cancel</Button>
        <Button onClick={commit} disabled={pending || validRows.length === 0}>
          {pending ? "Importing…" : `Import ${validRows.length} application${validRows.length === 1 ? "" : "s"}`}
        </Button>
      </div>
    </div>
  );
}

/**
 * Walk every sheet in the workbook, preserving:
 *  - Excel-typed dates (so dd/mm/yy and serial numbers both work)
 *  - hyperlink targets (kept under reserved `__link__<header>` keys so the
 *    importer can prefer the underlying URL when a column is mapped to jobLink)
 *  - the union of headers seen across sheets (so a workbook with "US" and
 *    "Intern" tabs can share a single mapping UI)
 */
async function parseXlsx(file: File): Promise<{ headers: string[]; rows: Record<string, unknown>[] }> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });

  const headerSet: string[] = [];
  const rows: Record<string, unknown>[] = [];

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    if (!sheet || !sheet["!ref"]) continue;
    const range = XLSX.utils.decode_range(sheet["!ref"]);

    // Header row (top of the visible range)
    const headerByCol: Record<number, string> = {};
    for (let C = range.s.c; C <= range.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: range.s.r, c: C });
      const cell = sheet[addr];
      if (!cell) continue;
      const text = String((cell as { w?: unknown }).w ?? cell.v ?? "").trim();
      if (!text) continue;
      headerByCol[C] = text;
      if (!headerSet.includes(text)) headerSet.push(text);
    }
    if (Object.keys(headerByCol).length === 0) continue;

    // Data rows
    for (let R = range.s.r + 1; R <= range.e.r; R++) {
      const row: Record<string, unknown> = {};
      let hasAny = false;
      for (const [colStr, header] of Object.entries(headerByCol)) {
        const C = Number(colStr);
        const addr = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = sheet[addr];
        if (!cell) continue;

        const raw = cell.v;
        const w = (cell as { w?: string }).w;
        let value: unknown;
        if (raw instanceof Date) {
          // Excel auto-parses ambiguous dates (e.g. "1/8/26") according to the
          // file's locale and may flip day/month from what the author typed.
          // The displayed text `cell.w` is the only reliable record of the
          // original column. If it looks like a numeric D/M/Y, prefer it so
          // our heuristic parser (DD/MM by default) decides what it means.
          if (typeof w === "string" && /^\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}$/.test(w)) {
            value = w;
          } else {
            value = raw;
          }
        } else if (typeof raw === "boolean" || typeof raw === "number") {
          value = raw;
        } else {
          value = w ?? raw ?? "";
        }
        if (value !== undefined && value !== null && value !== "") {
          row[header] = value;
          hasAny = true;
        }

        // Preserve hyperlinks (cell.l.Target) so jobLink mapping can prefer the URL.
        const link = (cell as { l?: { Target?: string } }).l?.Target;
        if (link && /^https?:/i.test(link)) {
          row[`${LINK_PREFIX}${header}`] = link;
          hasAny = true;
        }
      }
      if (hasAny) {
        row[SHEET_KEY] = sheetName;
        row[EXCEL_ROW_KEY] = R + 1;
        rows.push(row);
      }
    }
  }

  return { headers: headerSet, rows };
}

async function parseCsv(file: File): Promise<{ headers: string[]; rows: Record<string, unknown>[] }> {
  const text = await file.text();
  const result = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });
  const headers = result.meta.fields ?? [];
  return { headers, rows: result.data };
}
