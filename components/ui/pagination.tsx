"use client";

import React, { useMemo } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/utils";

export interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  className?: string;
  showEntriesCount?: boolean;
}

export function Pagination({
  currentPage,
  totalItems,
  pageSize = 10,
  onPageChange,
  className,
  showEntriesCount = true,
}: PaginationProps) {
  const tTable = useTranslations("common.table");

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  // Generate visible page numbers with ellipsis gaps
  const visiblePages = useMemo(() => {
    return Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => {
      return p === 1 || p === totalPages || Math.abs(p - safePage) <= 1;
    });
  }, [totalPages, safePage]);

  if (totalItems <= 0) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/60 text-xs",
        className,
      )}
    >
      {showEntriesCount && (
        <span className="text-muted-foreground">
          {tTable("showingEntries", {
            start: startIndex + 1,
            end: endIndex,
            total: totalItems,
          })}
        </span>
      )}

      {totalPages > 1 && (
        <div className="flex items-center gap-1.5 ml-auto">
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2.5 rounded-lg text-xs gap-1"
            onClick={() => onPageChange(Math.max(1, safePage - 1))}
            disabled={safePage <= 1}
            aria-label={tTable("prevPage")}
            title={tTable("prevPage")}
          >
            <ChevronLeft className="size-3.5" />
            <span className="hidden sm:inline">{tTable("prevPage")}</span>
          </Button>

          {/* Page Numbers */}
          <div className="flex items-center gap-1">
            {visiblePages.map((p, idx) => {
              const prev = visiblePages[idx - 1];
              const showEllipsis = prev && p - prev > 1;
              return (
                <React.Fragment key={p}>
                  {showEllipsis && (
                    <span className="px-1 text-muted-foreground select-none">…</span>
                  )}
                  <Button
                    variant={p === safePage ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "h-8 min-w-8 px-2 rounded-lg text-xs font-medium",
                      p === safePage && "shadow-xs font-semibold",
                    )}
                    onClick={() => onPageChange(p)}
                  >
                    {p}
                  </Button>
                </React.Fragment>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2.5 rounded-lg text-xs gap-1"
            onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
            disabled={safePage >= totalPages}
            aria-label={tTable("nextPage")}
            title={tTable("nextPage")}
          >
            <span className="hidden sm:inline">{tTable("nextPage")}</span>
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

export const AppPagination = Pagination;
