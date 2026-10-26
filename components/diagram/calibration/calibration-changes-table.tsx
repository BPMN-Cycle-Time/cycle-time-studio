"use client";

import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";

import type { CalibrationChange } from "@/services/model-calibration";
import { Badge, DataTable, type TableColumn } from "@/components/ui";

interface CalibrationChangesTableProps {
  changes: CalibrationChange[];
  unit: string;
}

/** Before → after table of a calibration preview. */
export function CalibrationChangesTable({ changes, unit }: CalibrationChangesTableProps) {
  const t = useTranslations("diagram.calibration");
  const tUnits = useTranslations("common.units");

  const format = (change: CalibrationChange, value: number | null): string => {
    if (value === null) return "—";
    if (change.kind === "taskTime") return `${value.toFixed(2)} ${tUnits(unit).toLowerCase()}`;
    return `${value.toFixed(1)}%`;
  };

  const columns: TableColumn<CalibrationChange>[] = [
    {
      key: "kind",
      header: t("colKind"),
      render: (row) => <Badge variant="secondary">{t(`kinds.${row.kind}`)}</Badge>,
      sortValue: (row) => row.kind,
      sortable: true,
    },
    {
      key: "target",
      header: t("colTarget"),
      render: (row) => <span className="text-xs font-medium text-foreground">{row.target}</span>,
      sortValue: (row) => row.target,
      sortable: true,
    },
    {
      key: "change",
      header: t("colChange"),
      render: (row) => (
        <span className="flex items-center gap-1.5 font-mono text-xs">
          <span className="text-muted-foreground">{format(row, row.before)}</span>
          <ArrowRight className="size-3 text-muted-foreground" />
          <span className="font-semibold text-foreground">{format(row, row.after)}</span>
        </span>
      ),
      csvValue: (row) => `${format(row, row.before)} -> ${format(row, row.after)}`,
    },
  ];

  return (
    <DataTable<CalibrationChange>
      data={changes}
      columns={columns}
      showSearch={false}
      showCopyCsv={false}
      showPagination={changes.length > 10}
      defaultPageSize={10}
      getRowId={(row, idx) => `${row.kind}-${row.target}-${idx}`}
      emptyMessage={<span className="text-muted-foreground text-sm">{t("noChanges")}</span>}
    />
  );
}
