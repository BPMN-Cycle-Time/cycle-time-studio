"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

import type { AnomalyEvaluation, TraceLabelMode } from "@/types";
import { TRACE_LABEL_MODES } from "@/services/graph-embedding";
import { AppCard, DataTable, type TableColumn } from "@/components/ui";
import { cn } from "@/utils";

const ANY = "__any__";

interface MetricRow {
  type: string;
  count: number;
  auc: Partial<Record<TraceLabelMode, number>>;
  /** Share of the type's cases flagged non-conformant by control-flow conformance (0..1). */
  conformance: number | null;
}

interface AnomalyMetricsTableProps {
  title: string;
  description?: string;
  evaluations: Partial<Record<TraceLabelMode, AnomalyEvaluation>>;
  conformanceByType: Record<string, number>;
}

/** AUC per anomaly type for one or several label modes, next to conformance detection. */
export function AnomalyMetricsTable({
  title,
  description,
  evaluations,
  conformanceByType,
}: AnomalyMetricsTableProps) {
  const t = useTranslations("diagram.embedding.anomaly");
  const modes = TRACE_LABEL_MODES.filter((m) => evaluations[m]);
  const first = evaluations[modes[0]!];

  const rows = useMemo<MetricRow[]>(() => {
    if (!first) return [];
    const types = Object.keys(first.byType).sort();
    const aucOf = (type: string) =>
      Object.fromEntries(
        modes.map((m) => [
          m,
          type === ANY ? evaluations[m]!.any.auc : (evaluations[m]!.byType[type]?.auc ?? NaN),
        ]),
      );
    return [
      ...types.map((type) => ({
        type,
        count: first.byType[type]!.count,
        auc: aucOf(type),
        conformance: conformanceByType[type] ?? null,
      })),
      { type: ANY, count: first.any.count, auc: aucOf(ANY), conformance: null },
    ];
  }, [first, modes, evaluations, conformanceByType]);

  const best = (row: MetricRow) => Math.max(...modes.map((m) => row.auc[m] ?? -1));

  const columns: TableColumn<MetricRow>[] = [
    {
      key: "type",
      header: t("anomalyType"),
      render: (r) => (
        <span className={cn("text-xs", r.type === ANY ? "font-bold" : "font-medium")}>
          {r.type === ANY ? t("allTypes") : r.type}
        </span>
      ),
      sortValue: (r) => (r.type === ANY ? "~" : r.type),
      csvValue: (r) => (r.type === ANY ? "ANY" : r.type),
      sortable: true,
    },
    {
      key: "count",
      header: t("caseCount"),
      render: (r) => <span className="font-mono text-xs">{r.count}</span>,
      sortValue: (r) => r.count,
      sortable: true,
    },
    ...modes.map((m) => ({
      key: `auc-${m}`,
      header: modes.length > 1 ? t("aucFor", { mode: t(`modes.${m}`) }) : t("auc"),
      render: (r: MetricRow) => {
        const v = r.auc[m] ?? NaN;
        const isBest = modes.length > 1 && v === best(r);
        return (
          <span className={cn("font-mono text-xs", isBest && "font-bold text-primary")}>
            {Number.isFinite(v) ? v.toFixed(3) : "—"}
          </span>
        );
      },
      sortValue: (r: MetricRow) => r.auc[m] ?? -1,
      csvValue: (r: MetricRow) => r.auc[m] ?? "",
      sortable: true,
    })),
    {
      key: "conformance",
      header: t("conformanceDetected"),
      render: (r) => (
        <span className="font-mono text-xs">
          {r.conformance === null ? "—" : `${Math.round(r.conformance * 100)}%`}
        </span>
      ),
      sortValue: (r) => r.conformance ?? -1,
      csvValue: (r) => (r.conformance === null ? "" : r.conformance),
      sortable: true,
    },
  ];

  return (
    <AppCard title={title} description={description}>
      <DataTable<MetricRow>
        data={rows}
        columns={columns}
        showSearch={false}
        showPagination={false}
        getRowId={(r) => r.type}
        rowClassName={(r) => (r.type === ANY ? "bg-muted/40" : undefined)}
      />
      {modes.length === 1 && first && (
        <p className="mt-2 text-xs text-muted-foreground">
          {t("precisionAtN", { value: first.precisionAtN.toFixed(3) })}
        </p>
      )}
    </AppCard>
  );
}
