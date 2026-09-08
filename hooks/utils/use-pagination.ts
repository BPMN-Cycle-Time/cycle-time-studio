"use client";

import { useState, useMemo, useCallback } from "react";
import { DEFAULT_PROJECTS_PAGE_SIZE } from "@/constants";

export interface UsePaginationOptions<T> {
  items: T[];
  pageSize?: number;
  initialPage?: number;
  /**
   * Optional reset dependency (e.g. search query, filter state)
   * that automatically resets current page to 1 when changed.
   */
  resetDependency?: unknown;
}

export interface UsePaginationReturn<T> {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  paginatedItems: T[];
  setPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  canNextPage: boolean;
  canPrevPage: boolean;
}

/**
 * Reusable client-side pagination hook.
 * Calculates slice indices, safe page boundary, and avoids cascading renders.
 */
export function usePagination<T>({
  items,
  pageSize = DEFAULT_PROJECTS_PAGE_SIZE,
  initialPage = 1,
  resetDependency,
}: UsePaginationOptions<T>): UsePaginationReturn<T> {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [prevResetDep, setPrevResetDep] = useState(resetDependency);

  // Adjust page to 1 in render phase when reset dependency changes
  if (resetDependency !== prevResetDep) {
    setPrevResetDep(resetDependency);
    setCurrentPage(1);
  }

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const paginatedItems = useMemo(() => {
    return items.slice(startIndex, endIndex);
  }, [items, startIndex, endIndex]);

  const setPage = useCallback(
    (page: number) => {
      setCurrentPage(Math.min(totalPages, Math.max(1, page)));
    },
    [totalPages],
  );

  const nextPage = useCallback(() => {
    setCurrentPage((p) => Math.min(totalPages, p + 1));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setCurrentPage((p) => Math.max(1, p - 1));
  }, []);

  return {
    currentPage: safePage,
    pageSize,
    totalItems,
    totalPages,
    startIndex,
    endIndex,
    paginatedItems,
    setPage,
    nextPage,
    prevPage,
    canNextPage: safePage < totalPages,
    canPrevPage: safePage > 1,
  };
}
