"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

import type { ActivityPerformance, PerformanceAnalysis } from "@/types";
import { AppCard, Badge, DataTable, type TableColumn } from "@/components/ui";
import { cn } from "@/utils";
import { formatShare, useFormatHours } from "./performance-format";

interface ActivityRow extends ActivityPerformance {
  share: number;
  /** 1-based bottleneck rank by waiting share, 0 when not in the top 3. */
  rank: number;
}

const TOP_BOTTLENECKS = 3;

export function PerformanceActivityTable({ analysis }: { analysis: PerformanceAnalysis }) {
  const t = useTranslations("diagram.performance.activities");
  const formatHours = useFormatHours();

  const rows = useMemo<ActivityRow[]>(() => {
    const shareOf = new Map(analysis.waitingShareRanking.map((r, i) => [r.activity, { ...r, i }]));
    return analysis.activities
      .map((a) => {
        const ranked = shareOf.get(a.activity);
        const rank = ranked && ranked.i < TOP_BOTTLENECKS && ranked.share > 0 ? ranked.i + 1 : 0;
        return { ...a, share: ranked?.share ?? 0, rank };
      })
      .sort((a, b) => b.share - a.share);
  }, [analysis]);

  const hours = (value: number | undefined) => (
    <span className="font-mono text-xs">{formatHours(value)}</span>
  );

  const columns: TableColumn<ActivityRow>[] = [
    {
      key: "activity",
      header: t("activity"),
      render: (row) => (
        <span className="flex items-center gap-2 text-xs font-medium text-foreground">
          {row.rank > 0 && <Badge variant="destructive">#{row.rank}</Badge>}
          {row.activity}
        </span>
      ),
      sortValue: (row) => row.activity,
      sortable: true,
    },
    {
      key: "count",
      header: t("count"),
      render: (row) => <span className="font-mono text-xs">{row.processing.count}</span>,
      sortValue: (row) => row.processing.count,
      sortable: true,
    },
    {
      key: "procMedian",
      header: t("processingMedian"),
      render: (row) => hours(row.processing.median),
      sortValue: (row) => row.processing.median,
      sortable: true,
    },
    {
      key: "procMean",
      header: t("processingMean"),
      render: (row) => hours(row.processing.mean),
      sortValue: (row) => row.processing.mean,
      sortable: true,
    },
    {
      key: "waitMedian",
      header: t("waitingMedian"),
      render: (row) => hours(row.waiting?.median),
      sortValue: (row) => row.waiting?.median ?? -1,
      sortable: true,
    },
    {
      key: "waitP95",
      header: t("waitingP95"),
      render: (row) => hours(row.waiting?.p95),
      sortValue: (row) => row.waiting?.p95 ?? -1,
      sortable: true,
    },
    {
      key: "waitMax",
      header: t("waitingMax"),
      render: (row) => hours(row.waiting?.max),
      sortValue: (row) => row.waiting?.max ?? -1,
      sortable: true,
    },
    {
      key: "share",
      header: t("waitingShare"),
      render: (row) => (
        <span className={cn("font-mono text-xs", row.rank > 0 && "font-bold text-destructive")}>
          {formatShare(row.share)}
        </span>
      ),
      sortValue: (row) => row.share,
      sortable: true,
    },
  ];

  return (
    <AppCard title={t("title")} description={t("description")}>
      <DataTable<ActivityRow>
        data={rows}
        columns={columns}
        showSearch={false}
        showPagination={rows.length > 15}
        defaultPageSize={20}
        getRowId={(row) => row.activity}
        rowClassName={(row) => (row.rank > 0 ? "bg-destructive/5" : undefined)}
      />
    </AppCard>
  );
}
