"use client";

import { useRef } from "react";
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
    | { kind: "create" }
    | { kind: "edit"; id: string; defaults: Partial<ApplicationInput> };
  onSaved?: (patch: Partial<ApplicationInput>) => void;
}

export function ApplicationSheet({ open, onOpenChange, mode, onSaved }: ApplicationSheetProps) {
  const isDesktop = useMediaQuery("(min-width: 640px)");
  const contentRef = useRef<HTMLDivElement>(null);
  const side = isDesktop ? "right" : "bottom";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
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
            mode={mode}
            autoFocusJobLink={isDesktop}
            onDone={() => onOpenChange(false)}
            onSaved={onSaved}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
