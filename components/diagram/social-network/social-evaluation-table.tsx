"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { SocialEvaluationRow } from "@/types";
import { DataTable, Badge, AppCard, type TableColumn } from "@/components/ui";

interface SocialEvaluationTableProps {
  evaluations: SocialEvaluationRow[];
}

export function SocialEvaluationTable({ evaluations }: SocialEvaluationTableProps) {
  const tDiag = useTranslations("diagram");

  const columns: TableColumn<SocialEvaluationRow>[] = useMemo(
    () => [
      {
        key: "resource",
        header: tDiag("colParticipant"),
        sortable: true,
        className: "font-medium text-xs min-w-[140px]",
        headerClassName: "min-w-[140px]",
        render: (row) => <span className="font-semibold text-foreground">{row.resource}</span>,
      },
      {
        key: "inDegree",
        header: tDiag("colDegreeIn"),
        sortable: true,
        className: "w-[100px] text-center font-mono text-xs",
        headerClassName: "w-[100px] text-center",
        render: (row) => (
          <span className="font-mono font-medium text-foreground">{row.inDegree}</span>
        ),
      },
      {
        key: "outDegree",
        header: tDiag("colDegreeOut"),
        sortable: true,
        className: "w-[100px] text-center font-mono text-xs",
        headerClassName: "w-[100px] text-center",
        render: (row) => (
          <span className="font-mono font-medium text-foreground">{row.outDegree}</span>
        ),
      },
      {
        key: "totalDegree",
        header: tDiag("colDegreeTotal"),
        sortable: true,
        className: "w-[110px] text-center font-mono text-xs",
        headerClassName: "w-[110px] text-center",
        render: (row) => (
          <Badge variant="secondary" className="font-mono font-bold text-xs px-2 py-0.5">
            {row.totalDegree}
          </Badge>
        ),
      },
      {
        key: "betweenness",
        header: tDiag("colBetweenness"),
        sortable: true,
        className: "w-[120px] text-right font-mono text-xs",
        headerClassName: "w-[120px] text-right",
        render: (row) => (
          <span className="font-mono text-xs font-semibold text-primary">
            {row.betweenness.toFixed(4)}
          </span>
        ),
      },
      {
        key: "inCloseness",
        header: tDiag("colClosenessIn"),
        sortable: true,
        className: "w-[120px] text-right font-mono text-xs",
        headerClassName: "w-[120px] text-right",
        render: (row) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.inCloseness.toFixed(4)}
          </span>
        ),
      },
      {
        key: "outCloseness",
        header: tDiag("colClosenessOut"),
        sortable: true,
        className: "w-[120px] text-right font-mono text-xs pr-4",
        headerClassName: "w-[120px] text-right pr-4",
        render: (row) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.outCloseness.toFixed(4)}
          </span>
        ),
      },
    ],
    [tDiag],
  );

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Table */}
      <div className="w-full">
        <DataTable<SocialEvaluationRow>
          data={evaluations}
          columns={columns}
          searchKeys={["resource"]}
        />
      </div>

      {/* 3 Metric Explanatory Cards (Directly matching course material) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
        <AppCard className="p-3.5 bg-muted/30 border border-border/50 flex flex-col gap-1.5">
          <h4 className="text-xs font-bold text-foreground tracking-tight">
            {tDiag("cardDegreeTitle")}
          </h4>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {tDiag("cardDegreeDesc")}
          </p>
        </AppCard>

        <AppCard className="p-3.5 bg-muted/30 border border-border/50 flex flex-col gap-1.5">
          <h4 className="text-xs font-bold text-foreground tracking-tight">
            {tDiag("cardBetweennessTitle")}
          </h4>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {tDiag("cardBetweennessDesc")}
          </p>
        </AppCard>

        <AppCard className="p-3.5 bg-muted/30 border border-border/50 flex flex-col gap-1.5">
          <h4 className="text-xs font-bold text-foreground tracking-tight">
            {tDiag("cardClosenessTitle")}
          </h4>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {tDiag("cardClosenessDesc")}
          </p>
        </AppCard>
      </div>
    </div>
  );
}
