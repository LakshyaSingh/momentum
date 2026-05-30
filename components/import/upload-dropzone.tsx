"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { FileSpreadsheet, ImageIcon, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadDropzoneProps {
  onFile: (file: File) => void;
  className?: string;
}

export function UploadDropzone({ onFile, className }: UploadDropzoneProps) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted[0]) onFile(accepted[0]);
    },
    [onFile],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
  });

  return (
    <div className={cn("grid grid-cols-1 gap-4 md:grid-cols-2", className)}>
      <div
        {...getRootProps()}
        className={cn(
          "glass-panel grain relative cursor-pointer overflow-hidden p-8 text-center transition-all hover:scale-[1.005] active:scale-[0.995]",
          isDragActive && "ring-2 ring-foreground/30",
        )}
      >
        <input {...getInputProps()} />
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-foreground/5 ring-1 ring-foreground/10">
          <UploadCloud className="size-7 text-foreground" />
        </div>
        <p className="mt-5 text-base font-medium tracking-tight">
          {isDragActive ? "Drop it here" : "Drop your spreadsheet"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          .xlsx · .xls · .csv, or click to browse
        </p>
        <div className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-foreground/[0.04] px-3 py-1 text-[11px] text-muted-foreground">
          <FileSpreadsheet className="size-3" /> Numbers · Excel · Sheets
        </div>
      </div>

      <div className="glass-panel relative overflow-hidden p-8 text-center">
        {/* Faded background content (icon + label) sits behind the overlay so the
            tile reads as a real-but-disabled feature, not a hole. */}
        <div className="opacity-30">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-foreground/5 ring-1 ring-foreground/10">
            <ImageIcon className="size-7" />
          </div>
          <p className="mt-5 text-base font-medium tracking-tight">Screenshot import</p>
          <p className="mt-1 text-xs text-muted-foreground">.png · .jpg</p>
        </div>

        {/* Strong frosted overlay so nothing underneath bleeds through. */}
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-md">
          <span className="rounded-full bg-foreground/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Coming soon
          </span>
          <p className="max-w-[18rem] text-sm text-foreground/80">
            Drop a screenshot of your tracker. We&apos;ll read it for you.
          </p>
        </div>
      </div>
    </div>
  );
}
