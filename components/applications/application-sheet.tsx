"use client";

import { useRef, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ApplicationForm } from "./application-form";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import type { ApplicationInput } from "@/lib/validators";

interface ApplicationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode:
    | { kind: "create"; defaults?: Partial<ApplicationInput> }
    | { kind: "edit"; id: string; defaults: Partial<ApplicationInput> };
  onSaved?: (patch: Partial<ApplicationInput>) => void;
  onCreated?: (id: string) => void;
}

export function ApplicationSheet({
  open,
  onOpenChange,
  mode,
  onSaved,
  onCreated,
}: ApplicationSheetProps) {
  const isDesktop = useMediaQuery("(min-width: 640px)");
  const contentRef = useRef<HTMLDivElement>(null);
  const side = isDesktop ? "right" : "bottom";
  // A create closes the sheet before the server answers. If it then fails,
  // reopen with what was typed so the entry is not lost.
  const [failed, setFailed] = useState<{ values: ApplicationInput; error: string } | null>(null);
  const formMode =
    mode.kind === "create" && failed
      ? { kind: "create" as const, defaults: { ...mode.defaults, ...failed.values } }
      : mode;
  const handleOpenChange = (next: boolean) => {
    if (!next) setFailed(null);
    onOpenChange(next);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        ref={contentRef}
        side={side}
        tabIndex={-1}
        onOpenAutoFocus={
          isDesktop
            ? undefined
            : (event) => {
                event.preventDefault();
                contentRef.current?.focus({ preventScroll: true });
              }
        }
        className={
          side === "bottom"
            ? "h-[calc(100dvh-1rem)] max-h-[92dvh] rounded-3xl"
            : undefined
        }
      >
        <SheetHeader>
          <SheetTitle>{mode.kind === "create" ? "New application" : "Edit application"}</SheetTitle>
          <SheetDescription>
            {mode.kind === "create"
              ? "Log it now. Momentum compounds."
              : "Make it match reality."}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6">
          <ApplicationForm
            mode={formMode}
            autoFocusJobLink={isDesktop}
            onDone={() => handleOpenChange(false)}
            onSaved={onSaved}
            onCreated={(id) => {
              setFailed(null);
              onCreated?.(id);
            }}
            onCreateFailed={(values, error) => {
              setFailed({ values, error });
              onOpenChange(true);
            }}
            initialError={failed?.error}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
