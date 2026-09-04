"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Network, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui";
import type { ProcessGraph } from "@/types";

interface GraphLegendProps {
  graph: ProcessGraph;
  adjacencyLines: { id: string; targets: string }[];
  loopsCount: number;
}

export function GraphLegend({ graph, adjacencyLines, loopsCount }: GraphLegendProps) {
  const t = useTranslations("diagram");
  const [showAdjacency, setShowAdjacency] = useState(false);

  return (
    <div className="flex flex-col gap-2.5 shrink-0 border-t border-border/40 pt-2 font-sans">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Legend */}
        <div className="gn-legend flex items-center flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
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

        {/* Stats & Toggle */}
        <div className="flex items-center gap-2.5 text-xs text-muted-foreground shrink-0">
          <span className="hidden lg:inline text-[11px] text-muted-foreground/80">
            {t("graphStats", {
              nodes: graph.nodes.length,
              edges: graph.edges.length,
              loops: loopsCount,
              hasLoops: loopsCount > 0 ? "true" : "false",
            })}
          </span>
          {adjacencyLines.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-[11px] font-medium gap-1.5 cursor-pointer"
              onClick={() => setShowAdjacency((prev) => !prev)}
              aria-expanded={showAdjacency}
            >
              <Network className="size-3 text-muted-foreground" />
              <span>{t("toggleAdjacency", { count: adjacencyLines.length })}</span>
              {showAdjacency ? (
                <ChevronUp className="size-3 text-muted-foreground" />
              ) : (
                <ChevronDown className="size-3 text-muted-foreground" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Adjacency List (Collapsible) */}
      {showAdjacency && (
        <div className="adjacency-container shrink-0 transition-all duration-200">
          <div className="adjacency-block">
            {adjacencyLines.map((row) => (
              <div key={row.id}>
                <span className="aid">{row.id}</span> &rarr;{" "}
                <span className="alab">{row.targets}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mobile/Tablet stats fallback when hidden above */}
      <p className="text-[11px] text-muted-foreground/80 shrink-0 font-sans lg:hidden">
        {t("graphStats", {
          nodes: graph.nodes.length,
          edges: graph.edges.length,
          loops: loopsCount,
          hasLoops: loopsCount > 0 ? "true" : "false",
        })}
      </p>
    </div>
  );
}
