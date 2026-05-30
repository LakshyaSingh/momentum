"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { ApplicationSheet } from "./application-sheet";

export function QuickAdd({ label = "New application" }: { label?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium tracking-tight text-background shadow-[0_1px_0_rgba(255,255,255,0.2)_inset,0_8px_22px_-8px_rgba(0,0,0,0.4)]"
      >
        <Plus className="size-4" />
        {label}
      </motion.button>
      <ApplicationSheet open={open} onOpenChange={setOpen} mode={{ kind: "create" }} />
    </>
  );
}
