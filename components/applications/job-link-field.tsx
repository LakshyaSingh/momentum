"use client";

import { useRef, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ParsedJobFields } from "@/lib/job-link/types";

type JobLinkFieldProps = {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onParsed: (fields: ParsedJobFields) => void;
  autoFocus?: boolean;
};

function looksLikeHttpUrl(value: string): boolean {
  return /^https?:\/\/.+/i.test(value.trim());
}

/**
 * Coerce an unknown (possibly non-string) value into a safe toast message.
 * Server error responses are not guaranteed to be strings — e.g. an
 * unexpected 500 body or a structured error object — and passing a non-string
 * to sonner's toast renders it as a React child, throwing React error #31
 * ("Objects are not valid as a React child") and white-screening the app.
 */
function asMessage(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

export function JobLinkField({
  value,
  onChange,
  onBlur,
  onParsed,
  autoFocus,
}: JobLinkFieldProps) {
  const [parsing, setParsing] = useState(false);
  const lastParsedUrl = useRef<string | null>(null);

  async function parseLink(url: string, { quiet = false }: { quiet?: boolean } = {}) {
    const trimmed = url.trim();
    if (!looksLikeHttpUrl(trimmed) || parsing) return;
    if (lastParsedUrl.current === trimmed) return;

    setParsing(true);
    try {
      const response = await fetch("/api/jobs/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        fields?: ParsedJobFields;
        error?: unknown;
        warning?: unknown;
      };

      if (!response.ok) {
        if (!quiet) toast.error(asMessage(data.error, "Couldn't read that job posting."));
        return;
      }

      if (!data.fields) {
        if (!quiet) toast.error("Couldn't read that job posting.");
        return;
      }

      lastParsedUrl.current = trimmed;
      onParsed(data.fields);

      const filled = [
        data.fields.role,
        data.fields.company,
        data.fields.location,
        data.fields.salary,
        data.fields.recruiter,
        data.fields.notes,
      ].filter(Boolean);
      if (!quiet) {
        const warning =
          typeof data.warning === "string" && data.warning.trim().length > 0
            ? data.warning
            : null;
        if (warning) {
          toast.warning(warning);
        } else {
          toast.success(
            filled.length > 0
              ? `Filled ${filled.length} field${filled.length === 1 ? "" : "s"} from the posting`
              : "Checked the posting",
          );
        }
      }
    } catch {
      if (!quiet) toast.error("Couldn't read that job posting.");
    } finally {
      setParsing(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Input
            type="url"
            autoFocus={autoFocus}
            placeholder="https://…"
            value={value}
            onChange={(event) => {
              lastParsedUrl.current = null;
              onChange(event.target.value);
            }}
            onBlur={() => {
              onBlur?.();
              void parseLink(value, { quiet: true });
            }}
            onPaste={(event) => {
              const pasted = event.clipboardData.getData("text").trim();
              if (!looksLikeHttpUrl(pasted)) return;
              window.setTimeout(() => {
                void parseLink(pasted);
              }, 50);
            }}
          />
          {parsing && (
            <Loader2 className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          className="shrink-0"
          disabled={!looksLikeHttpUrl(value) || parsing}
          onClick={() => void parseLink(value)}
        >
          {parsing ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Reading…
            </>
          ) : (
            <>
              <Sparkles className="mr-2 size-4" />
              Fill from link
            </>
          )}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Paste a job posting link and we&apos;ll try to fill the title, company, location, salary, recruiter, and notes.
      </p>
    </div>
  );
}
