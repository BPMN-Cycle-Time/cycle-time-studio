"use client";

import type { ReactNode } from "react";
import { GN_R, wrapLabel, EdgeRoutingStyle, buildCustomPath } from "@/services/graph";
import { buildManhattanPath } from "../process-model/process-model-helpers";
import type { ProcessGraph, ProcessGraphLayout, ProcessGraphNode, ProcessNodeShape } from "@/types";

interface GraphSvgRendererProps {
  graph: ProcessGraph;
  layout: ProcessGraphLayout;
  customPositions: Record<string, { x: number; y: number }>;
  customEdgeBends: Record<string, { x: number; y: number }>;
  routingStyle: EdgeRoutingStyle;
  draggingTargetId: string | null;
  selectedId: string | null;
  getNodePos: (id: string) => { x: number; y: number };
  onNodePointerDown: (e: React.PointerEvent, nodeId: string) => void;
  onEdgePointerDown: (
    e: React.PointerEvent,
    edgeKey: string,
    defaultPos: { x: number; y: number },
  ) => void;
  onPointerUp: (e: React.PointerEvent, n?: ProcessGraphNode) => void;
}

const GN_STYLE: Record<ProcessNodeShape, { fill: string; stroke: string; chip: string }> = {
  task: { fill: "var(--gn-task-soft, #dfeafa)", stroke: "var(--gn-task, #2a78d6)", chip: "" },
  xor: { fill: "var(--gn-gw-soft, #fbe4d9)", stroke: "var(--gn-gw, #eb6834)", chip: "X" },
  and: { fill: "var(--gn-gw-soft, #fbe4d9)", stroke: "var(--gn-gw, #eb6834)", chip: "+" },
  loop: { fill: "var(--gn-gw-soft, #fbe4d9)", stroke: "var(--gn-gw, #eb6834)", chip: "↺" },
  start: { fill: "var(--card, #ffffff)", stroke: "var(--foreground, #23261f)", chip: "" },
  end: { fill: "var(--card, #ffffff)", stroke: "var(--foreground, #23261f)", chip: "" },
};

export function GraphSvgRenderer({
  graph,
  layout,
  customEdgeBends,
  routingStyle,
  draggingTargetId,
  selectedId,
  getNodePos,
  onNodePointerDown,
  onEdgePointerDown,
  onPointerUp,
}: GraphSvgRendererProps) {
  const svgElements: ReactNode[] = [];

  // Forward edges
  layout.routed.forEach((r, idx) => {
    const rawPts = r.path
      .map((id) => getNodePos(id))
      .filter(
        (p): p is { x: number; y: number } =>
          !!p && typeof p.x === "number" && typeof p.y === "number",
      );
    if (rawPts.length < 2) return;
    const a = rawPts[0]!;
    const z = rawPts[rawPts.length - 1]!;
    const edgeKey = `fwd-${r.edge.s}-${r.edge.t}-${idx}`;

    const userBend = customEdgeBends?.[edgeKey];
    const defaultMidX = (a.x + z.x) / 2;
    const defaultMidY = (a.y + z.y) / 2;
    const midX = userBend ? userBend.x : defaultMidX;
    const midY = userBend ? userBend.y : defaultMidY;

    let d: string;
    const isStepped = Math.abs(a.y - z.y) > 4;

    if (routingStyle === EdgeRoutingStyle.ORTHOGONAL) {
      const sx = a.x + GN_R;
      const sy = a.y;
      const ex = z.x - (GN_R + 4);
      const ey = z.y;
      d = buildManhattanPath(sx, sy, midX, ex, ey, 8);
    } else {
      const dx1 = midX - a.x;
      const dy1 = midY - a.y;
      const len1 = Math.hypot(dx1, dy1) || 1;
      const sx = a.x + (dx1 / len1) * GN_R;
      const sy = a.y + (dy1 / len1) * GN_R;

      const dx2 = z.x - midX;
      const dy2 = z.y - midY;
      const len2 = Math.hypot(dx2, dy2) || 1;
      const ex = z.x - (dx2 / len2) * (GN_R + 4);
      const ey = z.y - (dy2 / len2) * (GN_R + 4);

      if (userBend) {
        d = buildCustomPath(
          [
            { x: sx, y: sy },
            { x: midX, y: midY },
            { x: ex, y: ey },
          ],
          routingStyle,
          8,
        );
      } else {
        d = buildCustomPath(
          [
            { x: sx, y: sy },
            { x: ex, y: ey },
          ],
          routingStyle,
          8,
        );
      }
    }

    svgElements.push(
      <g key={`edge-group-${edgeKey}`} className="graph-edge-group">
        <path
          d={d}
          fill="none"
          stroke="var(--foreground, #23261f)"
          strokeWidth={1.4}
          markerEnd="url(#gn-arrow)"
        />
      </g>,
    );

    // Draggable vertical/middle channel for stepped or bent edges
    if (isStepped || userBend) {
      const isDragging = draggingTargetId === edgeKey;
      svgElements.push(
        <g key={`edge-hdl-group-${edgeKey}`}>
          <line
            x1={midX}
            y1={Math.min(a.y, z.y)}
            x2={midX}
            y2={Math.max(a.y, z.y)}
            stroke="transparent"
            strokeWidth={18}
            style={{ cursor: "ew-resize" }}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => onEdgePointerDown(e, edgeKey, { x: midX, y: (a.y + z.y) / 2 })}
          />
          <circle
            cx={midX}
            cy={isStepped ? (a.y + z.y) / 2 : midY}
            r={5.5}
            className={`edge-handle ${isDragging ? "dragging" : ""}`}
            style={{ cursor: isStepped ? "ew-resize" : "move" }}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => onEdgePointerDown(e, edgeKey, { x: midX, y: (a.y + z.y) / 2 })}
          >
            <title>Drag to shift line position</title>
          </circle>
        </g>,
      );
    }

    if (r.edge.label) {
      const badgeW = r.edge.label.length * 6.5 + 14;
      const lblX = midX;
      const lblY = (a.y + z.y) / 2;
      svgElements.push(
        <g key={`fwd-lbl-${idx}`} style={{ pointerEvents: "none" }}>
          <rect
            x={lblX - badgeW / 2}
            y={lblY - 14}
            width={badgeW}
            height={16}
            rx={4}
            fill="var(--card, #ffffff)"
            stroke="var(--border, #ddd7c8)"
            strokeWidth={1}
            opacity={0.96}
          />
          <text
            x={lblX}
            y={lblY - 2}
            textAnchor="middle"
            fontSize={10}
            fill="var(--muted-foreground, #6f7266)"
            fontFamily="ui-monospace, monospace"
            fontWeight={500}
          >
            {r.edge.label}
          </text>
        </g>,
      );
    }
  });

  // Back (rework) edges
  graph.edges
    .filter((e) => e.back)
    .forEach((e, idx) => {
      const sp = getNodePos(e.s);
      const tp = getNodePos(e.t);
      if (!sp || !tp) return;

      const edgeKey = `back-${e.s}-${e.t}-${idx}`;
      const isSelf = e.s === e.t;
      const userBend = customEdgeBends?.[edgeKey];

      if (isSelf) {
        const defArcTop = sp.y - GN_R - 32;
        const peakX = userBend?.x ?? sp.x;
        const peakY = userBend?.y ?? defArcTop;

        const sx = sp.x - 14;
        const sy = sp.y - GN_R + 3;
        const ex = sp.x + 14;
        const ey = sp.y - GN_R + 3;

        const d = `M ${sx} ${sy} C ${peakX - 28} ${peakY} ${peakX + 28} ${peakY} ${ex} ${ey}`;

        svgElements.push(
          <g key={`back-group-${idx}`}>
            <path
              d={d}
              fill="none"
              stroke="transparent"
              strokeWidth={16}
              style={{ cursor: "ns-resize" }}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => onEdgePointerDown(e, edgeKey, { x: peakX, y: peakY })}
            />
            <path
              d={d}
              fill="none"
              stroke="var(--gn-back, #8b5a72)"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              markerEnd="url(#gn-arrow-back)"
              style={{ pointerEvents: "none" }}
            />
          </g>,
        );

        const isDragging = draggingTargetId === edgeKey;

        svgElements.push(
          <circle
            key={`back-hdl-${idx}`}
            cx={peakX}
            cy={peakY}
            r={5.5}
            className={`edge-handle ${isDragging ? "dragging" : ""}`}
            style={{ cursor: "ns-resize" }}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => onEdgePointerDown(e, edgeKey, { x: peakX, y: peakY })}
          >
            <title>Drag up/down to adjust repeat arc height</title>
          </circle>,
        );

        if (e.label) {
          const badgeW = e.label.length * 6.5 + 12;
          svgElements.push(
            <g key={`back-lbl-${idx}`} style={{ pointerEvents: "none" }}>
              <rect
                x={peakX - badgeW / 2}
                y={peakY - 14}
                width={badgeW}
                height={15}
                rx={4}
                fill="var(--card, #ffffff)"
                stroke="var(--gn-back, #8b5a72)"
                strokeWidth={0.8}
                opacity={0.96}
              />
              <text
                x={peakX}
                y={peakY - 3}
                textAnchor="middle"
                fontSize={10}
                fill="var(--gn-back, #8b5a72)"
                fontFamily="ui-monospace, monospace"
                fontWeight={500}
              >
                {e.label}
              </text>
            </g>,
          );
        }
      } else {
        const topY = Math.min(sp.y, tp.y) - 48;
        const midX = userBend?.x ?? (sp.x + tp.x) / 2;
        const midY = userBend?.y ?? topY;

        const sx = sp.x;
        const sy = sp.y - GN_R;
        const ex = tp.x;
        const ey = tp.y - GN_R;

        const d = `M ${sx} ${sy} C ${sx} ${midY} ${midX} ${midY} ${midX} ${midY} C ${midX} ${midY} ${ex} ${midY} ${ex} ${ey}`;

        svgElements.push(
          <g key={`back-long-group-${idx}`}>
            <path
              d={d}
              fill="none"
              stroke="transparent"
              strokeWidth={16}
              style={{ cursor: "ns-resize" }}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => onEdgePointerDown(e, edgeKey, { x: midX, y: midY })}
            />
            <path
              d={d}
              fill="none"
              stroke="var(--gn-back, #8b5a72)"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              markerEnd="url(#gn-arrow-back)"
              style={{ pointerEvents: "none" }}
            />
          </g>,
        );

        const isDragging = draggingTargetId === edgeKey;

        svgElements.push(
          <circle
            key={`back-long-hdl-${idx}`}
            cx={midX}
            cy={midY}
            r={5.5}
            className={`edge-handle ${isDragging ? "dragging" : ""}`}
            style={{ cursor: "ns-resize" }}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => onEdgePointerDown(e, edgeKey, { x: midX, y: midY })}
          >
            <title>Drag up/down to adjust loop channel</title>
          </circle>,
        );

        if (e.label) {
          const badgeW = e.label.length * 6.5 + 12;
          svgElements.push(
            <g key={`back-lbl-${idx}`} style={{ pointerEvents: "none" }}>
              <rect
                x={midX - badgeW / 2}
                y={midY - 14}
                width={badgeW}
                height={15}
                rx={4}
                fill="var(--card, #ffffff)"
                stroke="var(--gn-back, #8b5a72)"
                strokeWidth={0.8}
                opacity={0.96}
              />
              <text
                x={midX}
                y={midY - 3}
                textAnchor="middle"
                fontSize={10}
                fill="var(--gn-back, #8b5a72)"
                fontFamily="ui-monospace, monospace"
                fontWeight={500}
              >
                {e.label}
              </text>
            </g>,
          );
        }
      }
    });

  // Render Nodes
  graph.nodes.forEach((n) => {
    const p = getNodePos(n.id);
    if (!p) return;
    const st = GN_STYLE[n.shape] || GN_STYLE.task;
    const isSelected = selectedId === n.id;
    const isDragging = draggingTargetId === n.id;

    svgElements.push(
      <g
        key={n.id}
        className={`gn-node ${isSelected ? "selected" : ""} ${isDragging ? "dragging" : ""}`}
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
      </g>,
    );
  });

  return <>{svgElements}</>;
}
