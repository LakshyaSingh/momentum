"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { SegmentedControl } from "@/components/segmented-control";

const THEME_OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
] as const;

type ThemeValue = (typeof THEME_OPTIONS)[number]["value"];

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-9 w-56 animate-pulse rounded-full bg-muted/40" aria-hidden />;
  }

  const value: ThemeValue =
    theme === "light" || theme === "dark" || theme === "system" ? theme : "system";

  return (
    <SegmentedControl
      value={value}
      onChange={(next) => setTheme(next)}
      options={THEME_OPTIONS}
      layoutId="settings-theme"
    />
  );
}
