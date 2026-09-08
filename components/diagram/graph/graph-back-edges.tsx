"use client";

import type { ReactNode } from "react";
import { GN_R } from "@/services/graph";
import { buildRoundedOrthogonalPath } from "../process-model/process-model-helpers";
import type { ProcessGraphEdge } from "@/types";

export interface GraphBackEdgesProps {
  edges: ProcessGraphEdge[];
  customEdgeBends: Record<string, { x: number; y: number }>;
  draggingTargetId?: string | null;
  getNodePos: (id: string) => { x: number; y: number };
  onEdgePointerDown: (
    e: React.PointerEvent,
    edgeKey: string,
    defaultPos: { x: number; y: number },
    axis?: "x" | "y" | "both",
  ) => void;
}

export function GraphBackEdges({
  edges,
  customEdgeBends,
  getNodePos,
  onEdgePointerDown,
}: GraphBackEdgesProps): ReactNode {
  const elements: ReactNode[] = [];

  edges
    .filter((e) => e.back)
    .forEach((e, idx) => {
      const sp = getNodePos(e.s);
      const tp = getNodePos(e.t);
      if (!sp || !tp) return;

      const edgeKey = `back-${e.s}-${e.t}-${idx}`;
      const isSelf = e.s === e.t;
      const userBend = customEdgeBends?.[edgeKey];

      if (isSelf) {
        // Self-loop: Always anchored at sp.x, offset in Y relative to sp.y
        const defaultOffsetY = -(GN_R + 32);
        const offsetY = userBend?.y != null ? userBend.y : defaultOffsetY;
        const peakX = sp.x;
        const peakY = sp.y + offsetY;

        const sx = sp.x - 14;
        const sy = sp.y - GN_R + 3;
        const ex = sp.x + 14;
        const ey = sp.y - GN_R + 3;

        const d = `M ${sx} ${sy} C ${peakX - 28} ${peakY} ${peakX + 28} ${peakY} ${ex} ${ey}`;

        elements.push(
          <g key={`back-group-${idx}`}>
            <path
              d={d}
              fill="none"
              stroke="transparent"
              strokeWidth={20}
              style={{ cursor: "ns-resize" }}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => onEdgePointerDown(e, edgeKey, { x: peakX, y: offsetY }, "y")}
            />
            <path
              d={d}
              fill="none"
              stroke="var(--gn-back, #8b5a72)"
              strokeWidth={1.5}
              markerEnd="url(#gn-arrow-back)"
              style={{ pointerEvents: "none" }}
            />
          </g>,
        );

        if (e.label) {
          const badgeW = e.label.length * 6.5 + 12;
          elements.push(
            <g
              key={`back-lbl-${idx}`}
              style={{ cursor: "ns-resize" }}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => onEdgePointerDown(e, edgeKey, { x: peakX, y: offsetY }, "y")}
            >
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
        // Non-self repeat loop: Stems are ALWAYS locked to sp.x and tp.x
        // Vertical position is relative to node baseline (sp.y + tp.y) / 2
        const baseNodeY = (sp.y + tp.y) / 2;
        const defaultOffsetY = -(GN_R + 38); // Default above nodes to avoid colliding with lower branches
        const offsetY = userBend?.y != null ? userBend.y : defaultOffsetY;
        const midY = baseNodeY + offsetY;

        const isUnderneath = midY >= baseNodeY;
        const effectiveSourceX = sp.x;
        const effectiveTargetX = tp.x;

        const startPt = {
          x: effectiveSourceX,
          y: isUnderneath ? sp.y + GN_R : sp.y - GN_R,
        };
        const endPt = {
          x: effectiveTargetX,
          y: isUnderneath ? tp.y + GN_R + 3 : tp.y - GN_R - 3,
        };

        const loopPoints = [
          startPt,
          { x: effectiveSourceX, y: midY },
          { x: effectiveTargetX, y: midY },
          endPt,
        ];
        const d = buildRoundedOrthogonalPath(loopPoints, 8);

        const centerRailX = (effectiveSourceX + effectiveTargetX) / 2;
        const barMinX = Math.min(effectiveSourceX, effectiveTargetX);
        const barMaxX = Math.max(effectiveSourceX, effectiveTargetX);

        elements.push(
          <g key={`back-long-group-${idx}`}>
            {/* Visual repeat orthogonal path */}
            <path
              d={d}
              fill="none"
              stroke="var(--gn-back, #8b5a72)"
              strokeWidth={1.5}
              markerEnd="url(#gn-arrow-back)"
              style={{ pointerEvents: "none" }}
            />
            {/* Full path hit target: allows dragging loop up/down anywhere along the line */}
            <path
              d={d}
              fill="none"
              stroke="transparent"
              strokeWidth={20}
              style={{ cursor: "ns-resize" }}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) =>
                onEdgePointerDown(e, edgeKey, { x: centerRailX, y: offsetY }, "y")
              }
            />
            {/* Horizontal rail hit line */}
            <line
              x1={barMinX}
              y1={midY}
              x2={barMaxX}
              y2={midY}
              stroke="transparent"
              strokeWidth={20}
              style={{ cursor: "ns-resize" }}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) =>
                onEdgePointerDown(e, edgeKey, { x: centerRailX, y: offsetY }, "y")
              }
            />
          </g>,
        );

        if (e.label) {
          const badgeW = e.label.length * 6.5 + 14;
          const badgeH = 17;
          elements.push(
            <g
              key={`back-lbl-${idx}`}
              style={{ cursor: "ns-resize" }}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) =>
                onEdgePointerDown(e, edgeKey, { x: centerRailX, y: offsetY }, "y")
              }
            >
              <rect
                x={centerRailX - badgeW / 2}
                y={midY - badgeH / 2}
                width={badgeW}
                height={badgeH}
                rx={4}
                fill="var(--card, #ffffff)"
                stroke="var(--gn-back, #8b5a72)"
                strokeWidth={0.9}
                opacity={0.96}
              />
              <text
                x={centerRailX}
                y={midY + 3.5}
                textAnchor="middle"
                fontSize={10}
                fill="var(--gn-back, #8b5a72)"
                fontFamily="ui-monospace, monospace"
                fontWeight={600}
              >
                {e.label}
              </text>
            </g>,
          );
        }
      }
    });

  return <>{elements}</>;
}
