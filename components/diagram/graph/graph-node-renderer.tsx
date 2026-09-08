"use client";

import type { ReactNode } from "react";
import { GN_R, wrapLabel } from "@/services/graph";
import type { ProcessGraphNode, ProcessNodeShape } from "@/types";

export const GN_STYLE: Record<ProcessNodeShape, { fill: string; stroke: string; chip: string }> = {
  task: { fill: "var(--gn-task-soft, #dfeafa)", stroke: "var(--gn-task, #2a78d6)", chip: "" },
  xor: { fill: "var(--gn-gw-soft, #fbe4d9)", stroke: "var(--gn-gw, #eb6834)", chip: "X" },
  and: { fill: "var(--gn-gw-soft, #fbe4d9)", stroke: "var(--gn-gw, #eb6834)", chip: "+" },
  loop: { fill: "var(--gn-gw-soft, #fbe4d9)", stroke: "var(--gn-gw, #eb6834)", chip: "↺" },
  start: { fill: "var(--card, #ffffff)", stroke: "var(--foreground, #23261f)", chip: "" },
  end: { fill: "var(--card, #ffffff)", stroke: "var(--foreground, #23261f)", chip: "" },
};

export interface GraphNodeRendererProps {
  nodes: ProcessGraphNode[];
  getNodePos: (id: string) => { x: number; y: number };
  selectedId: string | null;
  draggingTargetId: string | null;
  onNodePointerDown: (e: React.PointerEvent, nodeId: string) => void;
  onPointerUp: (e: React.PointerEvent, n?: ProcessGraphNode) => void;
}

export function GraphNodeRenderer({
  nodes,
  getNodePos,
  selectedId,
  draggingTargetId,
  onNodePointerDown,
  onPointerUp,
}: GraphNodeRendererProps): ReactNode {
  return (
    <>
      {nodes.map((n) => {
        const p = getNodePos(n.id);
        if (!p) return null;
        const st = GN_STYLE[n.shape] || GN_STYLE.task;
        const isSelected = selectedId === n.id;
        const isDragging = draggingTargetId === n.id;

        return (
          <g
            key={n.id}
            className={`gn-node ${isSelected ? "selected" : ""} ${isDragging ? "dragging" : ""}`}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => onNodePointerDown(e, n.id)}
            onPointerUp={(e) => onPointerUp(e, n)}
          >
            <circle
              cx={p.x}
              cy={p.y}
              r={GN_R}
              fill={st.fill}
              stroke={st.stroke}
              strokeWidth={isSelected ? 2.5 : 1.8}
            />
            {st.chip ? (
              <text
                x={p.x}
                y={p.y + 4.5}
                textAnchor="middle"
                fontSize={12}
                fontWeight={700}
                fill={st.stroke}
                fontFamily="ui-monospace, monospace"
              >
                {st.chip}
              </text>
            ) : (
              <text
                x={p.x}
                y={p.y + 3.5}
                textAnchor="middle"
                fontSize={9.5}
                fontWeight={600}
                fill="var(--foreground, #23261f)"
                fontFamily="ui-monospace, monospace"
              >
                {n.id}
              </text>
            )}
            {n.name && (
              <text
                x={p.x}
                y={p.y + GN_R + 13}
                textAnchor="middle"
                fontSize={10}
                fill="var(--muted-foreground, #6f7266)"
              >
                {wrapLabel(n.name, 14)[0]}
              </text>
            )}
          </g>
        );
      })}
    </>
  );
}
