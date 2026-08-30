"use client";

import { useTranslations } from "next-intl";
import type { ProcessGraph } from "@/types";

interface GraphLegendProps {
  graph: ProcessGraph;
  adjacencyLines: { id: string; targets: string }[];
  loopsCount: number;
}

export function GraphLegend({ graph, adjacencyLines, loopsCount }: GraphLegendProps) {
  const t = useTranslations("diagram");

  return (
    <>
      {/* Legend */}
      <div className="gn-legend shrink-0 font-sans">
        <span className="gn-key">
          <span className="gn-dot ev" />
          {t("legend.startEnd")}
        </span>
        <span className="gn-key">
          <span className="gn-dot task" />
          {t("legend.task")}
        </span>
        <span className="gn-key">
          <span className="gn-dot gw" />
          {t("legend.gateway")} (<span className="gn-chip">X</span> {t("legend.exclusive")},{" "}
          <span className="gn-chip">+</span> {t("legend.parallel")},{" "}
          <span className="gn-chip">↺</span> {t("legend.rework")})
        </span>
        <span className="gn-key">
          <span className="gn-dash" />
          {t("legend.reworkLoop")}
        </span>
      </div>

      {/* Adjacency List */}
      <div className="adjacency-block shrink-0">
        {adjacencyLines.map((row) => (
          <div key={row.id}>
            <span className="aid">{row.id}</span> &rarr; <span className="alab">{row.targets}</span>
          </div>
        ))}
      </div>

      {/* Footer Statistics */}
      <p className="text-xs text-muted-foreground shrink-0 font-sans">
        {t("graphStats", {
          nodes: graph.nodes.length,
          edges: graph.edges.length,
          loops: loopsCount,
          hasLoops: loopsCount > 0 ? "true" : "false",
        })}
      </p>
    </>
  );
}
