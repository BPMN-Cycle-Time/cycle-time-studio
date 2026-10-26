"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

import type { CasePerformance, PerformanceAnalysis } from "@/types";
import { AppCard, DataTable, type TableColumn } from "@/components/ui";
import { formatShare, useFormatHours } from "./performance-format";

/** Cases sorted by waiting time (longest first), paginated. */
export function PerformanceCaseTable({ analysis }: { analysis: PerformanceAnalysis }) {
  const t = useTranslations("diagram.performance.cases");
  const formatHours = useFormatHours();

  const rows = useMemo(
    () => [...analysis.cases].sort((a, b) => b.waitingTime - a.waitingTime),
    [analysis],
  );
  const hours = (value: number) => <span className="font-mono text-xs">{formatHours(value)}</span>;

  const columns: TableColumn<CasePerformance>[] = [
    {
      key: "caseId",
      header: t("caseId"),
      render: (row) => <span className="text-xs font-medium text-foreground">{row.caseId}</span>,
      sortValue: (row) => row.caseId,
      sortable: true,
    },
    {
      key: "start",
      header: t("start"),
      render: (row) => (
        <span className="font-mono text-xs text-muted-foreground">
          {new Date(row.startTimestamp).toLocaleString()}
        </span>
      ),
      sortValue: (row) => row.startTimestamp,
      csvValue: (row) => row.startTimestamp,
      sortable: true,
    },
    {
      key: "waiting",
      header: t("waitingTime"),
      render: (row) => hours(row.waitingTime),
      sortValue: (row) => row.waitingTime,
      csvValue: (row) => row.waitingTime.toFixed(4),
      sortable: true,
    },
    {
      key: "processing",
      header: t("processingTime"),
      render: (row) => hours(row.processingTime),
      sortValue: (row) => row.processingTime,
      csvValue: (row) => row.processingTime.toFixed(4),
      sortable: true,
    },
    {
      key: "cycle",
      header: t("cycleTime"),
      render: (row) => hours(row.cycleTime),
      sortValue: (row) => row.cycleTime,
      csvValue: (row) => row.cycleTime.toFixed(4),
      sortable: true,
    },
    {
      key: "cte",
      header: t("cte"),
      render: (row) => <span className="font-mono text-xs">{formatShare(row.cte)}</span>,
      sortValue: (row) => row.cte,
      csvValue: (row) => row.cte.toFixed(4),
      sortable: true,
    },
  ];

  return (
    <AppCard title={t("title")} description={t("description")}>
      <DataTable<CasePerformance>
        data={rows}
        columns={columns}
        searchKeys={["caseId"]}
        searchPlaceholder={t("search")}
        defaultPageSize={10}
        getRowId={(row) => row.caseId}
      />
    </AppCard>
  );
}
