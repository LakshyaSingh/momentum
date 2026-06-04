"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import type { ApplicationStatus } from "@prisma/client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  DataTable,
  type ApplicationRow,
} from "@/components/applications/data-table";
import type { ApplicationFilters } from "@/components/applications/filter-bar";
import {
  APPLICATIONS_PAGE_SIZE,
  applicationsQueryToSearchParams,
  clampApplicationsPage,
  filterApplicationRows,
  paginateApplicationRows,
  sortApplicationRows,
  type ApplicationsQuery,
  type ApplicationsSortKey,
} from "@/lib/applications-list";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ApplicationsViewProps = {
  serverRows: ApplicationRow[];
  filteredTotal: number;
  totalAll: number;
  query: ApplicationsQuery;
};

export function ApplicationsView({
  serverRows,
  filteredTotal,
  totalAll,
  query,
}: ApplicationsViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [searchIndex, setSearchIndex] = useState<ApplicationRow[] | null>(null);
  const [indexLoading, setIndexLoading] = useState(true);
  const [filters, setFilters] = useState<ApplicationFilters>({
    search: query.search,
    statuses: query.statuses,
  });
  const [sort, setSort] = useState<{ key: ApplicationsSortKey; dir: "asc" | "desc" }>({
    key: query.sort,
    dir: query.dir,
  });
  const [clientPage, setClientPage] = useState(1);
  const [optimisticPatches, setOptimisticPatches] = useState<
    Record<string, Partial<ApplicationRow>>
  >({});
  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => new Set());
  const indexReady = useRef(false);
  const prevTotalAll = useRef(totalAll);

  const hasActiveFilters = Boolean(filters.search.trim() || filters.statuses.length);
  const useClientSearch = hasActiveFilters && searchIndex !== null;

  useEffect(() => {
    let cancelled = false;

    fetch("/api/applications/search-index")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load search index");
        return res.json() as Promise<{ rows: ApplicationRow[] }>;
      })
      .then((data) => {
        if (!cancelled) {
          setSearchIndex(data.rows);
          setIndexLoading(false);
          indexReady.current = true;
          prevTotalAll.current = totalAll;
        }
      })
      .catch(() => {
        if (!cancelled) setIndexLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Keep the client search index in sync after creates/deletes refresh server data.
  useEffect(() => {
    if (!indexReady.current || prevTotalAll.current === totalAll) return;

    prevTotalAll.current = totalAll;

    let cancelled = false;
    fetch("/api/applications/search-index")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to reload search index");
        return res.json() as Promise<{ rows: ApplicationRow[] }>;
      })
      .then((data) => {
        if (!cancelled) setSearchIndex(data.rows);
      })
      .catch(() => {
        /* non-fatal — server-rendered rows still work */
      });

    return () => {
      cancelled = true;
    };
  }, [totalAll]);

  useEffect(() => {
    setFilters({ search: query.search, statuses: query.statuses });
  }, [query.search, query.statuses.join(",")]);

  useEffect(() => {
    setSort({ key: query.sort, dir: query.dir });
  }, [query.sort, query.dir]);

  useEffect(() => {
    setClientPage(1);
  }, [filters.search, filters.statuses]);

  useEffect(() => {
    setOptimisticPatches({});
    setDeletedIds(new Set());
  }, [serverRows]);

  const applyRowMutations = useCallback(
    (rows: ApplicationRow[]) =>
      rows
        .filter((row) => !deletedIds.has(row.id))
        .map((row) => {
          const patch = optimisticPatches[row.id];
          return patch ? { ...row, ...patch } : row;
        }),
    [deletedIds, optimisticPatches],
  );

  const handleRowUpdated = useCallback(
    (id: string, patch: Partial<ApplicationRow>) => {
      const filteredOut =
        patch.status !== undefined &&
        filters.statuses.length > 0 &&
        !filters.statuses.includes(patch.status);

      if (filteredOut) {
        setDeletedIds((prev) => new Set(prev).add(id));
      } else {
        setOptimisticPatches((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
      }

      setSearchIndex((prev) =>
        prev ? prev.map((row) => (row.id === id ? { ...row, ...patch } : row)) : prev,
      );

      void router.refresh();
    },
    [filters.statuses, router],
  );

  const handleRowDeleted = useCallback(
    (id: string) => {
      setDeletedIds((prev) => new Set(prev).add(id));
      setSearchIndex((prev) => (prev ? prev.filter((row) => row.id !== id) : prev));

      void router.refresh();
    },
    [router],
  );

  const pushQuery = useCallback(
    (
      updates: Partial<{
        page: number;
        search: string;
        statuses: ApplicationStatus[];
        sort: ApplicationsSortKey;
        dir: "asc" | "desc";
      }>,
    ) => {
      const params = applicationsQueryToSearchParams(query, updates);
      const qs = params.toString();
      const href = qs ? `/applications?${qs}` : "/applications";
      startTransition(() => {
        router.push(href, { scroll: false });
      });
    },
    [query, router],
  );

  // Server-side search fallback until the background index finishes loading.
  useEffect(() => {
    if (searchIndex || !hasActiveFilters) return;

    const trimmed = filters.search.trim();
    const statusesMatch =
      filters.statuses.length === query.statuses.length &&
      filters.statuses.every((status, index) => status === query.statuses[index]);

    if (trimmed === query.search && statusesMatch) return;

    const timer = window.setTimeout(() => {
      pushQuery({ search: trimmed, statuses: filters.statuses, page: 1 });
    }, 300);

    return () => window.clearTimeout(timer);
  }, [filters, hasActiveFilters, query.search, query.statuses, pushQuery, searchIndex]);

  // Defer the search term that drives filtering so fast typing stays smooth:
  // the controlled input updates at normal priority (instant keystrokes) while
  // the expensive full-dataset filter + table re-render runs at lower priority
  // and can be interrupted. This is the main fix for typing lag — felt on both
  // browsers, worst on Safari where each re-render also re-rasterizes the glass
  // card's backdrop-filter.
  const deferredSearch = useDeferredValue(filters.search);

  const clientRows = useMemo(() => {
    if (!useClientSearch) return [];
    const filtered = filterApplicationRows(searchIndex!, deferredSearch, filters.statuses);
    return sortApplicationRows(filtered, sort);
  }, [useClientSearch, searchIndex, deferredSearch, filters.statuses, sort]);

  const safeClientPage = clampApplicationsPage(clientPage, clientRows.length, APPLICATIONS_PAGE_SIZE);

  useEffect(() => {
    if (clientPage !== safeClientPage) {
      setClientPage(safeClientPage);
    }
  }, [clientPage, safeClientPage]);

  const visibleRows = useMemo(() => {
    if (useClientSearch) {
      return applyRowMutations(
        paginateApplicationRows(clientRows, safeClientPage, APPLICATIONS_PAGE_SIZE),
      );
    }
    return applyRowMutations(serverRows);
  }, [useClientSearch, clientRows, safeClientPage, serverRows, applyRowMutations]);

  const showingTotal = useClientSearch ? clientRows.length : filteredTotal;
  const totalPages = Math.max(1, Math.ceil(showingTotal / APPLICATIONS_PAGE_SIZE));
  const currentPage = useClientSearch ? safeClientPage : query.page;
  const rangeStart = showingTotal === 0 ? 0 : (currentPage - 1) * APPLICATIONS_PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * APPLICATIONS_PAGE_SIZE, showingTotal);
  const waitingForIndex = hasActiveFilters && indexLoading && !searchIndex;

  function handleFiltersChange(next: ApplicationFilters) {
    setFilters(next);

    if (!next.search.trim() && next.statuses.length === 0) {
      pushQuery({ search: "", statuses: [], page: 1 });
    }
  }

  function handleSortChange(next: { key: ApplicationsSortKey; dir: "asc" | "desc" }) {
    setSort(next);

    if (useClientSearch) {
      setClientPage(1);
      return;
    }

    pushQuery({ ...next, page: 1 });
  }

  return (
    <div className="space-y-4">
      {waitingForIndex && (
        <p className="text-xs text-muted-foreground">Loading search index…</p>
      )}

      <div
        className={cn(
          (isPending || waitingForIndex) && "opacity-60 transition-opacity duration-200",
        )}
      >
        <DataTable
          rows={visibleRows}
          total={totalAll}
          filteredTotal={showingTotal}
          filters={filters}
          sort={sort}
          onFiltersChange={handleFiltersChange}
          onSortChange={handleSortChange}
          onRowUpdated={handleRowUpdated}
          onRowDeleted={handleRowDeleted}
        />
      </div>

      {showingTotal > APPLICATIONS_PAGE_SIZE && (
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            Showing {rangeStart}–{rangeEnd} of {showingTotal}
            {hasActiveFilters ? ` (${totalAll} total)` : ""}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1 || isPending}
              onClick={() => {
                if (useClientSearch) {
                  setClientPage((page) => Math.max(1, page - 1));
                  return;
                }
                pushQuery({ page: query.page - 1 });
              }}
            >
              <ChevronLeft className="size-4" />
              Previous
            </Button>
            <span className="min-w-[7rem] text-center text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages || isPending}
              onClick={() => {
                if (useClientSearch) {
                  setClientPage((page) => Math.min(totalPages, page + 1));
                  return;
                }
                pushQuery({ page: query.page + 1 });
              }}
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
