"use client";

import { useTranslations } from "next-intl";
import type { AutomationCandidate } from "@/types";
import { DataTable, type TableColumn } from "@/components/ui";

interface AutomationMatrixTableProps {
  candidates: AutomationCandidate[];
  unit: string;
}

export function AutomationMatrixTable({ candidates, unit }: AutomationMatrixTableProps) {
  const t = useTranslations("automation");

  const columns: TableColumn<AutomationCandidate>[] = [
    {
      key: "rank",
      header: "#",
      sortable: false,
      render: (_, index) => (
        <span className="font-mono text-xs text-muted-foreground">{(index ?? 0) + 1}</span>
      ),
      className: "w-10",
    },
    {
      key: "activity",
      header: t("activity"),
      sortable: true,
      sortValue: (row) => row.activity,
      render: (row) => <span className="text-xs font-medium">{row.activity}</span>,
    },
    {
      key: "score",
      header: t("score"),
      sortable: true,
      sortValue: (row) => row.score.composite,
      className: "text-right",
      headerClassName: "text-right justify-end",
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-primary">{row.score.composite}</span>
      ),
    },
    {
      key: "frequency",
      header: t("frequency"),
      sortable: true,
      sortValue: (row) => row.frequency,
      className: "text-right",
      headerClassName: "text-right justify-end",
      render: (row) => <span className="font-mono text-xs">{row.frequency}</span>,
    },
    {
      key: "avgDuration",
      header: t("avgDuration"),
      sortable: true,
      sortValue: (row) => row.avgDuration,
      className: "text-right",
      headerClassName: "text-right justify-end",
      render: (row) => (
        <span className="font-mono text-xs">
          {row.avgDuration} {unit}
        </span>
      ),
    },
    {
      key: "hoursSaved",
      header: t("hoursSaved"),
      sortable: true,
      sortValue: (row) => row.estimatedHoursSaved,
      className: "text-right",
      headerClassName: "text-right justify-end",
      render: (row) => (
        <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400">
          {row.estimatedHoursSaved}
        </span>
      ),
    },
  ];

  return (
    <DataTable
      data={candidates}
      columns={columns}
      searchPlaceholder={t("searchCandidates")}
      searchKeys={["activity"]}
      defaultPageSize={10}
      showCopyCsv={false}
      emptyMessage={<p className="text-xs text-muted-foreground py-8 text-center">{t("empty")}</p>}
    />
  );
}
