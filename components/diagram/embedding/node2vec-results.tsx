"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

import type { LabeledGraph, Node2VecJobResult } from "@/types";
import { cosineSimilarity } from "@/services/graph-embedding";
import { AppCard, AppSelect, Badge, Button, DataTable, type TableColumn } from "@/components/ui";
import { GROUP_COLORS } from "./embedding-scatter";

interface SimilarRow {
  id: string;
  label: string;
  cosine: number;
  cluster: number;
}

interface Node2VecResultsProps {
  graph: LabeledGraph;
  result: Node2VecJobResult;
  selectedId: string;
  onSelect: (id: string) => void;
}

const TOP_SIMILAR = 5;

/** Top-5 most similar nodes of the selected node and the members of each cluster. */
export function Node2VecResults({ graph, result, selectedId, onSelect }: Node2VecResultsProps) {
  const t = useTranslations("diagram.embedding.node2vec");
  const labelOf = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n.label])), [graph]);
  const nodeOptions = result.ids.map((id) => ({
    value: id,
    label: `${labelOf.get(id) ?? id} (${id})`,
  }));

  const similar = useMemo<SimilarRow[]>(() => {
    const idx = result.ids.indexOf(selectedId);
    if (idx === -1) return [];
    const base = result.vectors[idx]!;
    return result.ids
      .map((id, i) => ({
        id,
        label: labelOf.get(id) ?? id,
        cosine: cosineSimilarity(base, result.vectors[i]!),
        cluster: result.clusters[i]!,
      }))
      .filter((row) => row.id !== selectedId)
      .sort((a, b) => b.cosine - a.cosine)
      .slice(0, TOP_SIMILAR);
  }, [result, selectedId, labelOf]);

  const clusterBadge = (cluster: number) => (
    <Badge variant="outline" style={{ borderColor: GROUP_COLORS[cluster % GROUP_COLORS.length] }}>
      {t("clusterName", { index: cluster + 1 })}
    </Badge>
  );

  const columns: TableColumn<SimilarRow>[] = [
    {
      key: "label",
      header: t("node"),
      render: (r) => <span className="text-xs font-medium">{r.label}</span>,
    },
    {
      key: "id",
      header: t("nodeId"),
      render: (r) => <span className="font-mono text-xs text-muted-foreground">{r.id}</span>,
    },
    {
      key: "cosine",
      header: t("cosine"),
      render: (r) => <span className="font-mono text-xs">{r.cosine.toFixed(3)}</span>,
    },
    { key: "cluster", header: t("cluster"), render: (r) => clusterBadge(r.cluster) },
  ];

  const clusters = [...new Set(result.clusters)].sort((a, b) => a - b);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <AppCard
        title={t("similarTitle")}
        headerExtra={
          <AppSelect
            size="sm"
            value={selectedId}
            onValueChange={onSelect}
            options={nodeOptions}
            aria-label={t("node")}
            triggerClassName="min-w-[200px]"
          />
        }
      >
        <DataTable<SimilarRow>
          data={similar}
          columns={columns}
          showSearch={false}
          showPagination={false}
          showCopyCsv={false}
          getRowId={(r) => r.id}
        />
      </AppCard>
      <AppCard title={t("clustersTitle")} contentClassName="flex flex-col gap-2">
        {clusters.map((c) => (
          <div key={c} className="flex flex-wrap items-center gap-1.5">
            {clusterBadge(c)}
            {result.ids
              .filter((_, i) => result.clusters[i] === c)
              .map((id) => (
                <Button
                  key={id}
                  variant={id === selectedId ? "default" : "secondary"}
                  size="sm"
                  onClick={() => onSelect(id)}
                  className="h-6 px-2 text-[11px]"
                >
                  {labelOf.get(id) ?? id}
                </Button>
              ))}
          </div>
        ))}
      </AppCard>
    </div>
  );
}
