"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { MomentumGlass } from "@/components/glass/liquid-glass";

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;
export const SheetPortal = DialogPrimitive.Portal;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-background/40 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
SheetOverlay.displayName = DialogPrimitive.Overlay.displayName;

const sheetVariants = cva(
  "fixed z-50 overflow-hidden transition data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
  {
    variants: {
      side: {
        top: "inset-x-2 top-2 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom:
          "inset-x-2 bottom-2 data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom rounded-3xl",
        left: "inset-y-2 left-2 h-[calc(100%-1rem)] w-3/4 max-w-md data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
        right:
          "inset-y-2 right-2 h-[calc(100%-1rem)] w-full max-w-md data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-lg",
      },
    },
    defaultVariants: { side: "right" },
  },
);

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof sheetVariants> {}

export const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  SheetContentProps
>(({ side = "right", className, children, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <DialogPrimitive.Content ref={ref} className={cn(sheetVariants({ side }), className)} {...props}>
      <MomentumGlass
        variant="sheet"
        className="native-liquid-glass glass-panel grain relative flex h-full max-h-[inherit] min-h-0 w-full flex-col overflow-hidden"
      >
        <DialogPrimitive.Close className="absolute right-4 top-4 z-10 rounded-full opacity-60 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring/40">
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
        <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] [-webkit-overflow-scrolling:touch] sm:p-8">
          {children}
        </div>
      </MomentumGlass>
    </DialogPrimitive.Content>
  </SheetPortal>
));
SheetContent.displayName = DialogPrimitive.Content.displayName;

export function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col space-y-1.5 text-left", className)} {...props} />;
}
export function SheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />;
}

export const SheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-xl font-semibold tracking-tight", className)}
    {...props}
  />
));
SheetTitle.displayName = DialogPrimitive.Title.displayName;

export const SheetDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
SheetDescription.displayName = DialogPrimitive.Description.displayName;
