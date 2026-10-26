"use client";

import { useTranslations } from "next-intl";

import type { PerformanceAnalysis, ResourcePerformance } from "@/types";
import { AppCard, DataTable, type TableColumn } from "@/components/ui";
import { useFormatHours } from "./performance-format";

export function PerformanceResourceTable({ analysis }: { analysis: PerformanceAnalysis }) {
  const t = useTranslations("diagram.performance.resources");
  const formatHours = useFormatHours();
  const hours = (value: number | undefined) => (
    <span className="font-mono text-xs">{formatHours(value)}</span>
  );

  const columns: TableColumn<ResourcePerformance>[] = [
    {
      key: "resource",
      header: t("resource"),
      render: (row) => <span className="text-xs font-medium text-foreground">{row.resource}</span>,
      sortValue: (row) => row.resource,
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
      key: "procTotal",
      header: t("processingTotal"),
      render: (row) => hours(row.processing.total),
      sortValue: (row) => row.processing.total,
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
  ];

  return (
    <AppCard title={t("title")}>
      <DataTable<ResourcePerformance>
        data={[...analysis.resources].sort((a, b) => b.processing.total - a.processing.total)}
        columns={columns}
        showSearch={false}
        showPagination={analysis.resources.length > 10}
        defaultPageSize={10}
        getRowId={(row) => row.resource}
      />
    </AppCard>
  );
}
