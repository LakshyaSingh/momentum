"use client";

import { useRef } from "react";

/**
 * Keep the last non-null value after it becomes null.
 *
 * Radix animates a dialog out when `open` flips to false, but only while the
 * element is still mounted. Rendering `{row && <Sheet … />}` removes the
 * subtree in the same commit that closes it, so `data-[state=closed]:animate-out`
 * never runs and the sheet appears to vanish instead of sliding away.
 *
 * Retaining the previous value keeps the subtree mounted — and keeps it
 * rendering the row it was opened with — for the length of the exit animation.
 * Radix unmounts the content itself once the animation finishes.
 */
export function useRetained<T>(value: T | null): T | null {
  const retained = useRef<T | null>(null);
  if (value !== null) retained.current = value;
  return value ?? retained.current;
}
