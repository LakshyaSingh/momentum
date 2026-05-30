"use client";

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
  const side = isDesktop ? "right" : "bottom";
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        className={
          side === "bottom"
            ? "max-h-[92svh] overflow-y-auto rounded-3xl"
            : "overflow-y-auto"
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
            onDone={() => onOpenChange(false)}
            onSaved={onSaved}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
