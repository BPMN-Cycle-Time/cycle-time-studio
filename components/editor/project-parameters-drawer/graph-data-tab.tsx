"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { Project } from "@/types";
import { AppCard, DataTable } from "@/components/ui";
import { buildProcessGraph } from "@/utils";

interface MappedNode {
  id: string;
  name: string;
  type: string;
  time: string;
}

interface MappedEdge {
  id: string;
  source: string;
  target: string;
  label: string;
}

interface GraphDataTabProps {
  project: Project;
}

export function GraphDataTab({ project }: GraphDataTabProps) {
  const t = useTranslations("editor.graphData");

  // Generate canonical graph nodes & edges matching n1, n2, n3...
  const { nodes: rawNodes, edges: rawEdges } = useMemo(() => {
    return buildProcessGraph(project.blocks, project.tasks);
  }, [project.blocks, project.tasks]);

  const mappedNodes = useMemo(() => {
    return rawNodes.map((n) => ({
      id: n.id,
      name: n.name,
      type: n.type,
      time: n.time || "—",
    }));
  }, [rawNodes]);

  const mappedEdges = useMemo(() => {
    return rawEdges.map((e, idx) => ({
      id: `e_${idx}`,
      source: e.s,
      target: e.t,
      label: e.label || "—",
    }));
  }, [rawEdges]);

  // Column definitions for DataTable
  const nodeColumns = useMemo(
    () => [
      {
        key: "id",
        header: t("colId"),
        render: (row: MappedNode) => (
          <span className="font-mono text-primary font-semibold">{row.id}</span>
        ),
      },
      {
        key: "name",
        header: t("colNodeName"),
      },
      {
        key: "type",
        header: t("colNodeType"),
        render: (row: MappedNode) => <span className="text-muted-foreground">{row.type}</span>,
      },
      {
        key: "time",
        header: t("colTime"),
        render: (row: MappedNode) => (
          <span className="font-mono text-muted-foreground">{row.time}</span>
        ),
      },
    ],
    [t],
  );

  const edgeColumns = useMemo(
    () => [
      {
        key: "source",
        header: t("colSource"),
        render: (row: MappedEdge) => (
          <span className="font-mono text-primary font-semibold">{row.source}</span>
        ),
      },
      {
        key: "target",
        header: t("colTail"),
        render: (row: MappedEdge) => (
          <span className="font-mono text-primary font-semibold">{row.target}</span>
        ),
      },
      {
        key: "label",
        header: t("colLabel"),
        render: (row: MappedEdge) => <span className="text-muted-foreground">{row.label}</span>,
      },
    ],
    [t],
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Nodes CSV card */}
      <AppCard title={t("nodesCardTitle")}>
        <DataTable data={mappedNodes} columns={nodeColumns} searchPlaceholder={t("searchNodes")} />
      </AppCard>

      {/* Edges CSV card */}
      <AppCard title={t("edgesCardTitle")}>
        <DataTable data={mappedEdges} columns={edgeColumns} searchPlaceholder={t("searchEdges")} />
      </AppCard>
    </div>
  );
}
