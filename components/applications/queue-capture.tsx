"use client";

import { useRef, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createQueuedJob } from "@/app/actions/queued-jobs";
import { asMessage, looksLikeHttpUrl } from "@/lib/job-link-client";
import type { QueuedJobRow } from "@/lib/queued-jobs";

type QueueCaptureProps = {
  /**
   * Called the moment the row exists server-side. The parent appends it and
   * kicks off the slow page parse; capture deliberately does not wait for that.
   */
  onCreated: (row: QueuedJobRow) => void;
};

export function QueueCapture({ onCreated }: QueueCaptureProps) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function save(rawUrl: string) {
    const url = rawUrl.trim();
    if (!looksLikeHttpUrl(url) || saving) return;

    setSaving(true);
    try {
      const res = await createQueuedJob({ jobLink: url });
      if (!res.ok) {
        toast.error(asMessage(res.error, "Couldn't queue that link."));
        return;
      }
      onCreated(res.job);
      setValue("");
    } catch (err) {
      console.error("Queue capture failed", err);
      toast.error("Couldn't queue that link.");
    } finally {
      setSaving(false);
      // Refocus regardless of outcome so the paste-Enter-paste loop never
      // stalls on a single bad link.
      inputRef.current?.focus();
    }
  }

  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        void save(value);
      }}
    >
      <div className="relative flex-1">
        <Input
          ref={inputRef}
          type="url"
          inputMode="url"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onPaste={(event) => {
            // Read the clipboard directly rather than waiting for the
            // controlled value to round-trip through state — that is what makes
            // paste-then-save feel instant.
            const pasted = event.clipboardData.getData("text");
            if (!looksLikeHttpUrl(pasted)) return;
            event.preventDefault();
            setValue(pasted.trim());
            void save(pasted);
          }}
          placeholder="Paste a job link and press Enter"
          aria-label="Job link to queue"
          className="pr-10"
        />
        {saving && (
          <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>
      <Button type="submit" size="sm" disabled={!looksLikeHttpUrl(value) || saving}>
        <Plus className="mr-1.5 size-4" />
        Queue
      </Button>
    </form>
  );
}
