"use client";

import { useEffect, useState } from "react";
import { uniqueApplicationFieldValues } from "@/lib/applications-list";

export function useApplicationFieldSuggestions() {
  const [companies, setCompanies] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/applications/search-index")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load suggestions");
        return res.json() as Promise<{
          rows: { company: string; role: string; location: string | null }[];
        }>;
      })
      .then((data) => {
        if (cancelled) return;
        setCompanies(uniqueApplicationFieldValues(data.rows.map((row) => row.company)));
        setRoles(uniqueApplicationFieldValues(data.rows.map((row) => row.role)));
        setLocations(
          uniqueApplicationFieldValues(
            data.rows.map((row) => row.location).filter((value): value is string => Boolean(value)),
          ),
        );
      })
      .catch(() => {
        /* suggestions are optional */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { companies, roles, locations };
}
