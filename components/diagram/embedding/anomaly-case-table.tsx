"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

import type { TraceCaseSummary } from "@/types";
import { AppCard, Badge, DataTable, type TableColumn } from "@/components/ui";

interface RankedCase extends TraceCaseSummary {
  rank: number;
  labels: string[];
}

interface AnomalyCaseTableProps {
  cases: TraceCaseSummary[];
  groundTruth: Record<string, string[]> | null;
}

const MAX_SEQUENCE = 8;

/** Cases ranked by anomaly score (highest first). */
export function AnomalyCaseTable({ cases, groundTruth }: AnomalyCaseTableProps) {
  const t = useTranslations("diagram.embedding.anomaly");
  const rows = useMemo<RankedCase[]>(
    () =>
      [...cases]
        .sort((a, b) => b.score - a.score || (a.caseId < b.caseId ? -1 : 1))
        .map((c, i) => ({ ...c, rank: i + 1, labels: groundTruth?.[c.caseId] ?? [] })),
    [cases, groundTruth],
  );

  const sequence = (acts: string[]) =>
    acts.length > MAX_SEQUENCE
      ? `${acts.slice(0, MAX_SEQUENCE).join(" → ")} → … (+${acts.length - MAX_SEQUENCE})`
      : acts.join(" → ");

  const columns: TableColumn<RankedCase>[] = [
    {
      key: "rank",
      header: t("rank"),
      render: (r) => <span className="font-mono text-xs">{r.rank}</span>,
      sortValue: (r) => r.rank,
      sortable: true,
    },
    {
      key: "caseId",
      header: t("caseId"),
      render: (r) => <span className="text-xs font-medium">{r.caseId}</span>,
      sortValue: (r) => r.caseId,
      sortable: true,
    },
    {
      key: "score",
      header: t("score"),
      render: (r) => <span className="font-mono text-xs">{r.score.toFixed(4)}</span>,
      sortValue: (r) => r.score,
      csvValue: (r) => r.score,
      sortable: true,
    },
    {
      key: "events",
      header: t("events"),
      render: (r) => <span className="font-mono text-xs">{r.eventCount}</span>,
      sortValue: (r) => r.eventCount,
      sortable: true,
    },
    {
      key: "slow",
      header: t("slowEvents"),
      render: (r) => <span className="font-mono text-xs">{r.slowCount}</span>,
      sortValue: (r) => r.slowCount,
      sortable: true,
    },
    ...(groundTruth
      ? [
          {
            key: "labels",
            header: t("groundTruthLabels"),
            render: (r: RankedCase) =>
              r.labels.length ? (
                <span className="flex flex-wrap gap-1">
                  {r.labels.map((l) => (
                    <Badge key={l} variant="destructive">
                      {l}
                    </Badge>
                  ))}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              ),
            csvValue: (r: RankedCase) => r.labels.join(";"),
          },
        ]
      : []),
    {
      key: "sequence",
      header: t("sequence"),
      render: (r) => (
        <span className="text-[11px] text-muted-foreground">{sequence(r.activities)}</span>
      ),
      csvValue: (r) => r.activities.join(" > "),
    },
  ];

  return (
    <AppCard title={t("casesTitle")} description={t("casesDescription")}>
      <DataTable<RankedCase>
        data={rows}
        columns={columns}
        searchKeys={["caseId"]}
        searchPlaceholder={t("searchCase")}
        defaultPageSize={10}
        getRowId={(r) => r.caseId}
      />
    </AppCard>
  );
}
