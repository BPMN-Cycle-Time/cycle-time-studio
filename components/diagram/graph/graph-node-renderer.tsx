"use client";

import type { ReactNode } from "react";
import { GN_R, wrapLabel } from "@/services/graph";
import type { ProcessGraphEdge, ProcessGraphNode, ProcessNodeShape } from "@/types";

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
  edges?: ProcessGraphEdge[];
  customEdgeBends?: Record<string, { x: number; y: number }>;
  getNodePos: (id: string) => { x: number; y: number };
  selectedId: string | null;
  draggingTargetId: string | null;
  onNodePointerDown: (e: React.PointerEvent, nodeId: string) => void;
  onPointerUp: (e: React.PointerEvent, n?: ProcessGraphNode) => void;
}

export function computeNodePortUsage(
  nodeId: string,
  edges: ProcessGraphEdge[] | undefined,
  getNodePos: (id: string) => { x: number; y: number },
  customEdgeBends?: Record<string, { x: number; y: number }>,
) {
  let hasBottom = false;
  let hasTop = false;
  let hasLeft = false;
  let hasRight = false;

  if (!edges) return { hasBottom, hasTop, hasLeft, hasRight };

  edges.forEach((e, idx) => {
    if (e.s !== nodeId && e.t !== nodeId) return;
    const sp = getNodePos(e.s);
    const tp = getNodePos(e.t);
    if (!sp || !tp) return;

    const dx = tp.x - sp.x;
    const dy = tp.y - sp.y;

    const isSource = e.s === nodeId;
    const isTarget = e.t === nodeId;

    if (e.back) {
      const isSelf = e.s === e.t;
      if (isSelf) {
        if (isSource) hasTop = true;
      } else {
        const baseNodeY = (sp.y + tp.y) / 2;
        const defaultOffsetY = -(GN_R + 38);
        const backKey1 = `back-${e.s}-${e.t}`;
        const backKey2 = `back-${e.s}-${e.t}-${idx}`;
        const userOffset = customEdgeBends?.[backKey1]?.y ?? customEdgeBends?.[backKey2]?.y;
        const offsetY = userOffset != null ? userOffset : defaultOffsetY;
        const midY = baseNodeY + offsetY;
        const isUnderneath = midY >= baseNodeY;

        if (isUnderneath) {
          if (isSource) hasBottom = true;
          if (isTarget) hasBottom = true;
        } else {
          if (isSource) hasTop = true;
          if (isTarget) hasTop = true;
        }
      }
      return;
    }

    // Forward edge
    const fwdKey1 = `fwd-${e.s}-${e.t}`;
    const fwdKey2 = `fwd-${e.s}-${e.t}-${idx}`;
    const bend = customEdgeBends?.[fwdKey1] ?? customEdgeBends?.[fwdKey2];
    const userY = bend?.y;

    // Vertical stack check
    if (Math.abs(dx) < GN_R * 1.5) {
      if (dy < -GN_R * 1.2) {
        if (isSource) hasTop = true;
        if (isTarget) hasBottom = true;
      } else if (dy > GN_R * 1.2) {
        if (isSource) hasBottom = true;
        if (isTarget) hasTop = true;
      }
    } else if (dx > 0) {
      if (userY != null && userY > Math.max(sp.y, tp.y) + GN_R + 4) {
        // Routed underneath: exits source bottom, enters target bottom
        if (isSource) hasBottom = true;
        if (isTarget) hasBottom = true;
      } else if (userY != null && userY < Math.min(sp.y, tp.y) - GN_R - 4) {
        // Routed above: exits source top, enters target top
        if (isSource) hasTop = true;
        if (isTarget) hasTop = true;
      } else {
        // Standard left-to-right
        if (isSource) hasRight = true;
        if (isTarget) hasLeft = true;
      }
    } else {
      // Backward forward edge (dx <= 0)
      if (isSource) hasBottom = true;
      if (isTarget) hasBottom = true;
    }
  });

  return { hasBottom, hasTop, hasLeft, hasRight };
}

export function GraphNodeRenderer({
  nodes,
  edges,
  customEdgeBends,
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

        const { hasBottom, hasTop, hasLeft, hasRight } = computeNodePortUsage(
          n.id,
          edges,
          getNodePos,
          customEdgeBends,
        );

        let labelX = p.x;
        let labelY = p.y + GN_R + 13;
        let textAnchor: "middle" | "start" | "end" = "middle";

        if (hasBottom && !hasTop) {
          // Bottom port occupied by an edge: flip label to TOP so it never collides
          labelY = p.y - GN_R - 6;
        } else if (hasBottom && hasTop) {
          // Both top and bottom occupied: flip label to empty side
          if (!hasRight) {
            labelX = p.x + GN_R + 6;
            labelY = p.y + 3.5;
            textAnchor = "start";
          } else if (!hasLeft) {
            labelX = p.x - GN_R - 6;
            labelY = p.y + 3.5;
            textAnchor = "end";
          } else {
            labelY = p.y - GN_R - 6;
          }
        }

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
                x={labelX}
                y={labelY}
                textAnchor={textAnchor}
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
