"use client";

import { useTransition } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { exportApplicationsCsv } from "@/app/actions/user";

export function ExportButton() {
  const [pending, start] = useTransition();

  function download() {
    start(async () => {
      const csv = await exportApplicationsCsv();
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const stamp = new Date().toISOString().slice(0, 10);
      a.download = `momentum-applications-${stamp}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV downloaded");
    });
  }

  return (
    <Button variant="outline" onClick={download} disabled={pending}>
      <Download className="size-4" /> {pending ? "Preparing…" : "Export as CSV"}
    </Button>
  );
}
