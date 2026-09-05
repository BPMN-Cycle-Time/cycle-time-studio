"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { SocialNetworkEdge } from "@/types";
import { DataTable, Badge, type TableColumn } from "@/components/ui";

interface SocialMatrixTableProps {
  edges: SocialNetworkEdge[];
  totalInteractions: number;
}

interface EdgeRow {
  id: string;
  source: string;
  target: string;
  weight: number;
  share: number;
}

export function SocialMatrixTable({ edges, totalInteractions }: SocialMatrixTableProps) {
  const tDiag = useTranslations("diagram");

  const rows: EdgeRow[] = useMemo(() => {
    return edges
      .map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        weight: e.weight,
        share: totalInteractions > 0 ? Math.round((e.weight / totalInteractions) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.weight - a.weight);
  }, [edges, totalInteractions]);

  const columns: TableColumn<EdgeRow>[] = useMemo(
    () => [
      {
        key: "source",
        header: tDiag("sourceResource"),
        sortable: true,
        className: "min-w-[130px]",
        headerClassName: "min-w-[130px]",
        render: (row) => (
          <Badge variant="secondary" className="font-medium text-xs">
            {row.source}
          </Badge>
        ),
      },
      {
        key: "target",
        header: tDiag("targetResource"),
        sortable: true,
        className: "min-w-[130px]",
        headerClassName: "min-w-[130px]",
        render: (row) => (
          <Badge variant="outline" className="font-medium text-xs">
            {row.target}
          </Badge>
        ),
      },
      {
        key: "weight",
        header: tDiag("interactionCount"),
        sortable: true,
        className: "w-[85px] text-right font-mono",
        headerClassName: "w-[85px] text-right",
        render: (row) => (
          <span className="font-mono text-xs font-semibold text-primary">{row.weight}</span>
        ),
      },
      {
        key: "share",
        header: tDiag("colShare"),
        sortable: true,
        className: "w-[95px] text-right font-mono pr-3",
        headerClassName: "w-[95px] text-right pr-3",
        render: (row) => (
          <span className="font-mono text-xs text-muted-foreground">{row.share}%</span>
        ),
      },
    ],
    [tDiag],
  );

  return (
    <div className="flex flex-col gap-2 w-full">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {tDiag("matrixTitle")} ({edges.length})
      </h3>
      {edges.length === 0 ? (
        <p className="text-xs text-muted-foreground italic py-6 text-center">
          {tDiag("noInteractions")}
        </p>
      ) : (
        <div className="w-full">
          <DataTable<EdgeRow> data={rows} columns={columns} searchKeys={["source", "target"]} />
        </div>
      )}
    </div>
  );
}
