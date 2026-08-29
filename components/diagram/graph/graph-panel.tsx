"use client";

import { Card } from "@/components/ui";
import { GN_R, buildProcessGraph, layoutProcessGraph, wrapLabel } from "@/services/graph";
import { SelectionKind, useEditorStore } from "@/store/useEditorStore";
import type { Block, ProcessNodeShape, Task } from "@/types";
import { useTranslations } from "next-intl";
import { useMemo, type ReactNode } from "react";
import { DiagramInspector } from "../diagram-inspector";
import { DiagramViewport } from "../diagram-viewport";
import { ImportGraphDialog } from "../import-graph-dialog";
import "./graph-panel.css";

interface GraphPanelProps {
  blocks: Block[];
  tasks?: Task[];
}

const GN_STYLE: Record<ProcessNodeShape, { fill: string; stroke: string; chip: string }> = {
  task: { fill: "var(--gn-task-soft, #dfeafa)", stroke: "var(--gn-task, #2a78d6)", chip: "" },
  xor: { fill: "var(--gn-gw-soft, #fbe4d9)", stroke: "var(--gn-gw, #eb6834)", chip: "X" },
  and: { fill: "var(--gn-gw-soft, #fbe4d9)", stroke: "var(--gn-gw, #eb6834)", chip: "+" },
  loop: { fill: "var(--gn-gw-soft, #fbe4d9)", stroke: "var(--gn-gw, #eb6834)", chip: "↺" },
  start: { fill: "var(--card, #ffffff)", stroke: "var(--foreground, #23261f)", chip: "" },
  end: { fill: "var(--card, #ffffff)", stroke: "var(--foreground, #23261f)", chip: "" },
};

export function GraphPanel({ blocks, tasks }: GraphPanelProps) {
  const t = useTranslations("diagram");
  const selectedId = useEditorStore((s) => s.selectedId);
  const select = useEditorStore((s) => s.select);

  const graph = useMemo(() => buildProcessGraph(blocks, tasks), [blocks, tasks]);
  const layout = useMemo(() => layoutProcessGraph(graph), [graph]);

  // Adjacency lines
  const adjacencyLines = useMemo(() => {
    const bySource: Record<string, { t: string; label: string }[]> = {};
    graph.edges.forEach((e) => {
      bySource[e.s] = bySource[e.s] ?? [];
      bySource[e.s]!.push({ t: e.t, label: e.label });
    });

    return graph.nodes
      .filter((n) => bySource[n.id]?.length)
      .map((n) => {
        const targets = bySource[n.id]!.map((e) => `${e.t}${e.label ? ` [${e.label}]` : ""}`).join(
          ", ",
        );
        return { id: n.id, targets };
      });
  }, [graph]);

  const loopsCount = useMemo(
    () => graph.nodes.filter((n) => n.type === "XOR gateway (loop)").length,
    [graph.nodes],
  );

  if (blocks.length === 0 || !layout) {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <div className="h-[420px] flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground border rounded-lg border-dashed p-6 text-center">
          <p>{t("graphEmpty")}</p>
          <ImportGraphDialog />
        </div>
      </div>
    );
  }

  const svgElements: ReactNode[] = [];

  // Forward edges
  layout.routed.forEach((r, idx) => {
    const pts = r.path.map((id) => layout.xy[id]).filter(Boolean) as { x: number; y: number }[];
    if (pts.length < 2) return;
    const a = pts[0]!;
    const z = pts[pts.length - 1]!;
    let d: string;

    if (pts.length === 2) {
      const dx = z.x - a.x;
      const dy = z.y - a.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const sx = a.x + (dx / len) * GN_R;
      const sy = a.y + (dy / len) * GN_R;
      const ex = z.x - (dx / len) * (GN_R + 3);
      const ey = z.y - (dy / len) * (GN_R + 3);
      d = `M ${sx} ${sy} L ${ex} ${ey}`;
    } else {
      const mids = pts
        .slice(1, -1)
        .map((p) => `${p.x} ${p.y}`)
        .join(" L ");
      const last = pts[pts.length - 2]!;
      const ddx = z.x - last.x;
      const ddy = z.y - last.y;
      const dlen = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
      const sx = a.x + GN_R;
      const sy = a.y;
      const ex = z.x - (ddx / dlen) * (GN_R + 3);
      const ey = z.y - (ddy / dlen) * (GN_R + 3);
      d = `M ${sx} ${sy} L ${mids} L ${ex} ${ey}`;
    }

    svgElements.push(
      <path
        key={`fwd-${idx}`}
        d={d}
        fill="none"
        stroke="var(--foreground, #23261f)"
        strokeWidth={1.4}
        markerEnd="url(#gn-arrow)"
      />,
    );

    if (r.edge.label) {
      const mid = pts[Math.floor(pts.length / 2)]!;
      svgElements.push(
        <text
          key={`fwd-lbl-${idx}`}
          x={mid.x}
          y={mid.y - 6}
          textAnchor="middle"
          fontSize={10}
          fill="var(--muted-foreground, #6f7266)"
          fontFamily="ui-monospace, monospace"
        >
          {r.edge.label}
        </text>,
      );
    }
  });

  // Back (rework) edges
  graph.edges
    .filter((e) => e.back)
    .forEach((e, idx) => {
      const sp = layout.xy[e.s];
      const tp = layout.xy[e.t];
      if (!sp || !tp) return;

      const top = Math.min(sp.y, tp.y) - 28;
      const d = `M ${sp.x} ${sp.y - GN_R} C ${sp.x} ${top} ${tp.x} ${top} ${tp.x} ${tp.y - GN_R - 3}`;
      svgElements.push(
        <path
          key={`back-${idx}`}
          d={d}
          fill="none"
          stroke="var(--gn-back, #8b5a72)"
          strokeWidth={1.5}
          strokeDasharray="4 3"
          markerEnd="url(#gn-arrow-back)"
        />,
      );

      if (e.label) {
        svgElements.push(
          <text
            key={`back-lbl-${idx}`}
            x={(sp.x + tp.x) / 2}
            y={top - 4}
            textAnchor="middle"
            fontSize={10}
            fill="var(--gn-back, #8b5a72)"
            fontFamily="ui-monospace, monospace"
            fontWeight={500}
          >
            {e.label}
          </text>,
        );
      }
    });

  // Nodes
  graph.nodes.forEach((n) => {
    const pt = layout.xy[n.id];
    if (!pt) return;

    const st = GN_STYLE[n.shape] || GN_STYLE.task;
    const isStartEnd = n.shape === "start" || n.shape === "end";
    const isSelected = n.owner ? selectedId === n.owner.id : false;

    const handleClick = () => {
      if (!n.owner) return;
      select(n.owner.kind === "branch" ? SelectionKind.BRANCH : SelectionKind.BLOCK, n.owner.id);
    };

    const lines = wrapLabel(n.name, 14);

    svgElements.push(
      <g
        key={`node-${n.id}`}
        className={`gnode ${isStartEnd ? "static" : ""} ${isSelected ? "sel" : ""}`}
        onClick={handleClick}
      >
        <circle
          className="halo"
          cx={pt.x}
          cy={pt.y}
          r={GN_R + 6}
          fill="none"
          stroke={st.stroke}
          strokeWidth={1.4}
          strokeDasharray="3 3"
          opacity={0.7}
        />
        <circle
          cx={pt.x}
          cy={pt.y}
          r={GN_R}
          fill={st.fill}
          stroke={st.stroke}
          strokeWidth={isStartEnd ? 2.4 : 1.8}
        />
        {st.chip && (
          <text
            x={pt.x}
            y={pt.y + 4.5}
            textAnchor="middle"
            fontSize={13}
            fontWeight={700}
            fill={st.stroke}
            fontFamily="ui-monospace, monospace"
          >
            {st.chip}
          </text>
        )}
        <text
          x={pt.x}
          y={pt.y - GN_R - 5}
          textAnchor="middle"
          fontSize={11}
          fontWeight={600}
          fill="var(--foreground, #23261f)"
          fontFamily="ui-monospace, monospace"
        >
          {n.id}
        </text>
        {lines.map((line, i) => (
          <text
            key={i}
            x={pt.x}
            y={pt.y + GN_R + 13 + i * 11}
            textAnchor="middle"
            fontSize={10.5}
            fill="var(--muted-foreground, #6f7266)"
          >
            {line}
          </text>
        ))}
      </g>,
    );
  });

  return (
    <div className="w-full h-full flex-1 flex flex-col min-h-0 gap-4">
      <div className="flex items-center justify-between gap-4 shrink-0">
        <div className="text-xs text-muted-foreground font-medium">{t("directedGraphTitle")}</div>
        <div className="shrink-0">
          <ImportGraphDialog />
        </div>
      </div>

      <Card className="p-4 gap-4 w-full h-full flex-1 flex flex-col min-h-[480px] overflow-hidden">
        {/* SVG Diagram Canvas */}
        <DiagramViewport
          contentWidth={layout.width}
          contentHeight={layout.height}
          className="flex-1 w-full h-full min-h-0 mb-4"
        >
          <svg
            viewBox={`0 0 ${layout.width} ${layout.height}`}
            width={layout.width}
            height={layout.height}
            role="img"
            aria-label="Process Directed Graph"
          >
            <defs>
              <marker
                id="gn-arrow"
                viewBox="0 0 10 10"
                refX={7}
                refY={5}
                markerWidth={6}
                markerHeight={6}
                orient="auto"
              >
                <path d="M0,0 L10,5 L0,10 z" fill="var(--foreground, #23261f)" />
              </marker>
              <marker
                id="gn-arrow-back"
                viewBox="0 0 10 10"
                refX={7}
                refY={5}
                markerWidth={6}
                markerHeight={6}
                orient="auto"
              >
                <path d="M0,0 L10,5 L0,10 z" fill="var(--gn-back, #8b5a72)" />
              </marker>
            </defs>
            {svgElements}
          </svg>
        </DiagramViewport>

        {/* Legend */}
        <div className="gn-legend">
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
            {t("legend.gateway")} <span className="gn-chip">X</span> {t("legend.exclusive")}{" "}
            <span className="gn-chip">+</span> {t("legend.parallel")}{" "}
            <span className="gn-chip">↺</span> {t("legend.rework")}
          </span>
          <span className="gn-key">
            <span className="gn-dash" />
            {t("legend.reworkLoop")}
          </span>
        </div>

        {/* Adjacency List */}
        <div className="adjacency-block">
          {adjacencyLines.map((line) => (
            <div key={line.id}>
              <span className="aid">{line.id}</span>
              {" → "}
              <span className="alab">{line.targets}</span>
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
      </Card>

      <DiagramInspector />
    </div>
  );
}
