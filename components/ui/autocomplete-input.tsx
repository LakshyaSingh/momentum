"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Input, type InputProps } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type AutocompleteInputProps = Omit<InputProps, "value" | "onChange"> & {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
};

function filterSuggestions(suggestions: string[], query: string, limit = 8) {
  const trimmed = query.trim();
  const normalized = trimmed.toLowerCase();

  const matches = trimmed
    ? suggestions.filter((item) => item.toLowerCase().includes(normalized))
    : suggestions;

  const ranked = [...matches].sort((a, b) => {
    if (!trimmed) return a.localeCompare(b);
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();
    const aStarts = aLower.startsWith(normalized);
    const bStarts = bLower.startsWith(normalized);
    if (aStarts !== bStarts) return aStarts ? -1 : 1;
    return a.localeCompare(b);
  });

  return ranked.slice(0, limit);
}

export function AutocompleteInput({
  value,
  onChange,
  suggestions,
  onFocus,
  onBlur,
  onKeyDown,
  className,
  ...props
}: AutocompleteInputProps) {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const filtered = useMemo(
    () => filterSuggestions(suggestions, value),
    [suggestions, value],
  );

  useEffect(() => {
    setHighlight(0);
  }, [value, filtered.length]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function selectSuggestion(next: string) {
    onChange(next);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <Input
        {...props}
        className={className}
        value={value}
        role="combobox"
        aria-expanded={open && filtered.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onFocus={(event) => {
          onFocus?.(event);
          if (suggestions.length > 0) setOpen(true);
        }}
        onBlur={(event) => {
          onBlur?.(event);
          window.setTimeout(() => setOpen(false), 120);
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (!open || filtered.length === 0) return;

          if (event.key === "ArrowDown") {
            event.preventDefault();
            setHighlight((current) => (current + 1) % filtered.length);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setHighlight((current) => (current - 1 + filtered.length) % filtered.length);
          } else if (event.key === "Enter" && filtered[highlight]) {
            event.preventDefault();
            selectSuggestion(filtered[highlight]);
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
      />

      {open && filtered.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-border/60 bg-popover p-1 shadow-lg"
        >
          {filtered.map((item, index) => (
            <li key={item} role="option" aria-selected={index === highlight}>
              <button
                type="button"
                className={cn(
                  "flex w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
                  index === highlight && "bg-accent",
                )}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectSuggestion(item)}
              >
                {item}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
