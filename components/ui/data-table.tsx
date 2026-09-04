"use client";

import React, { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowUpDown, Copy, Check, Search } from "lucide-react";
import { cn } from "@/utils";
import { Button } from "./button";
import { AppInput } from "./app-input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "./table";

export interface TableColumn<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
  sticky?: "left" | "right" | boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  searchPlaceholder?: string;
  searchKeys?: string[];
}

export function DataTable<T extends object>({
  data,
  columns,
  searchPlaceholder,
  searchKeys,
}: DataTableProps<T>) {
  const tBtn = useTranslations("common.buttons");
  const tStatus = useTranslations("common.status");
  const tInputs = useTranslations("common.inputs");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [copied, setCopied] = useState(false);

  // 1. Filtering (Search)
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const query = searchQuery.toLowerCase();
    const keysToSearch = searchKeys ?? columns.map((col) => col.key);

    return data.filter((row) =>
      keysToSearch.some((key) => {
        const val = (row as Record<string, unknown>)[key];
        return val != null && String(val).toLowerCase().includes(query);
      }),
    );
  }, [data, searchQuery, searchKeys, columns]);

  // 2. Sorting
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortKey];
      const bVal = (b as Record<string, unknown>)[sortKey];

      if (aVal == null) return 1;
      if (bVal == null) return -1;

      const aStr = String(aVal);
      const bStr = String(bVal);

      const comparison = aStr.localeCompare(bStr, undefined, {
        numeric: true,
        sensitivity: "base",
      });
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [filteredData, sortKey, sortOrder]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  // 3. CSV Copy Generation
  const csvContent = useMemo(() => {
    const headers = columns.map((col) => col.header).join(",");
    const rows = filteredData
      .map((row) =>
        columns
          .map((col) => {
            const val = (row as Record<string, unknown>)[col.key];
            const cellString = val == null ? "" : String(val);
            return /[",\n]/.test(cellString) ? `"${cellString.replace(/"/g, '""')}"` : cellString;
          })
          .join(","),
      )
      .join("\n");
    return `${headers}\n${rows}`;
  }, [filteredData, columns]);

  const handleCopy = () => {
    navigator.clipboard.writeText(csvContent).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Controls: Search & Copy CSV */}
      <div className="flex items-center gap-2 justify-between">
        <AppInput
          prefix={<Search className="h-3.5 w-3.5" />}
          placeholder={searchPlaceholder || tInputs("search")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          wrapperClassName="flex-1"
          inputClassName="bg-muted/50 focus:bg-background"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className={cn(
            "h-8 px-3 text-xs font-medium gap-1.5 transition-all",
            copied &&
              "text-emerald-600 dark:text-emerald-500 border-emerald-200 dark:border-emerald-950 bg-emerald-50/50 dark:bg-emerald-950/20",
          )}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              {tBtn("copiedCsv")}
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              {tBtn("copyCsv")}
            </>
          )}
        </Button>
      </div>

      {/* Table Container */}
      <div className="border rounded-lg bg-card overflow-hidden isolate">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                  className={cn(
                    "font-semibold select-none whitespace-nowrap",
                    col.sortable !== false && "cursor-pointer hover:text-foreground",
                    (col.sticky === "left" || col.sticky === true) &&
                      "sticky left-0 z-20 bg-[color-mix(in_srgb,var(--muted)_40%,var(--card))] border-r border-border/50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]",
                    col.sticky === "right" &&
                      "sticky right-0 z-20 bg-[color-mix(in_srgb,var(--muted)_40%,var(--card))] border-l border-border/50 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.06)]",
                    col.headerClassName,
                  )}
                >
                  <div className="flex items-center gap-1 whitespace-nowrap">
                    <span>{col.header}</span>
                    {col.sortable !== false && (
                      <ArrowUpDown
                        className={cn(
                          "h-3 w-3 opacity-40 transition-opacity shrink-0",
                          sortKey === col.key && "opacity-100 text-primary",
                        )}
                      />
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="p-8 text-center text-muted-foreground font-medium"
                >
                  {tStatus("noRecords")}
                </TableCell>
              </TableRow>
            ) : (
              sortedData.map((row, idx) => (
                <TableRow
                  key={((row as Record<string, unknown>).id as string | number) ?? idx}
                  className="group/row hover:bg-muted/30 transition-colors"
                >
                  {columns.map((col) => (
                    <TableCell
                      key={col.key}
                      className={cn(
                        (col.sticky === "left" || col.sticky === true) &&
                          "sticky left-0 z-10 bg-card group-hover/row:bg-[color-mix(in_srgb,var(--muted)_30%,var(--card))] border-r border-border/50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]",
                        idx === sortedData.length - 1 &&
                          (col.sticky === "left" || col.sticky === true) &&
                          "rounded-bl-lg",
                        col.sticky === "right" &&
                          "sticky right-0 z-10 bg-card group-hover/row:bg-[color-mix(in_srgb,var(--muted)_30%,var(--card))] border-l border-border/50 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.06)]",
                        idx === sortedData.length - 1 && col.sticky === "right" && "rounded-br-lg",
                        col.className,
                      )}
                    >
                      {col.render
                        ? col.render(row)
                        : ((row as Record<string, unknown>)[col.key] as React.ReactNode)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
