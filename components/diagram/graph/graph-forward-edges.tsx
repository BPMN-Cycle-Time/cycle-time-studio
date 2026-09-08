"use client";

import type { ReactNode } from "react";
import { GN_R, EdgeRoutingStyle, buildCustomPath } from "@/services/graph";
import {
  buildManhattanPath,
  buildRoundedOrthogonalPath,
} from "../process-model/process-model-helpers";
import type { ProcessGraphRoutedEdge } from "@/types";

export interface GraphForwardEdgesProps {
  routed: ProcessGraphRoutedEdge[];
  customEdgeBends: Record<string, { x: number; y: number }>;
  routingStyle: EdgeRoutingStyle;
  draggingTargetId?: string | null;
  getNodePos: (id: string) => { x: number; y: number };
  onEdgePointerDown: (
    e: React.PointerEvent,
    edgeKey: string,
    defaultPos: { x: number; y: number },
    axis?: "x" | "y" | "both",
  ) => void;
}

export function GraphForwardEdges({
  routed,
  customEdgeBends,
  routingStyle,
  getNodePos,
  onEdgePointerDown,
}: GraphForwardEdgesProps): ReactNode {
  const elements: ReactNode[] = [];

  routed.forEach((r, idx) => {
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

    const srcKey = `${edgeKey}-s0`;
    const tgtKey = `${edgeKey}-s2`;
    const midKey = edgeKey;

    const userBend = customEdgeBends?.[midKey];
    const bendS0 = customEdgeBends?.[srcKey];
    const bendS2 = customEdgeBends?.[tgtKey];

    const defaultMidX = (a.x + z.x) / 2;
    const defaultMidY = (a.y + z.y) / 2;
    const midX = userBend ? userBend.x : defaultMidX;
    const midY = userBend ? userBend.y : defaultMidY;

    const userY = bendS0?.y ?? bendS2?.y ?? userBend?.y;

    let d: string;
    let isUShape = false;
    let uShapeY = midY;
    const isStepped = Math.abs(a.y - z.y) > 4;

    if (routingStyle === EdgeRoutingStyle.ORTHOGONAL) {
      if (userY != null && userY > Math.max(a.y, z.y) + GN_R + 6) {
        isUShape = true;
        uShapeY = userY;
        const exitX = bendS0?.x ?? a.x;
        const entryX = bendS2?.x ?? z.x;
        const waypoints = [
          { x: exitX, y: a.y + GN_R },
          { x: exitX, y: userY },
          { x: entryX, y: userY },
          { x: entryX, y: z.y + GN_R + 3 },
        ];
        d = buildRoundedOrthogonalPath(waypoints, 8);
      } else if (userY != null && userY < Math.min(a.y, z.y) - GN_R - 6) {
        isUShape = true;
        uShapeY = userY;
        const exitX = bendS0?.x ?? a.x;
        const entryX = bendS2?.x ?? z.x;
        const waypoints = [
          { x: exitX, y: a.y - GN_R },
          { x: exitX, y: userY },
          { x: entryX, y: userY },
          { x: entryX, y: z.y - GN_R - 3 },
        ];
        d = buildRoundedOrthogonalPath(waypoints, 8);
      } else {
        const sx = a.x + GN_R;
        const sy = a.y;
        const ex = z.x - (GN_R + 4);
        const ey = z.y;
        if (!isStepped && Math.abs(sy - ey) <= 4) {
          d = `M ${sx} ${sy} L ${ex} ${ey}`;
        } else {
          d = buildManhattanPath(sx, sy, midX, ex, ey, 8);
        }
      }
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

    elements.push(
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

    if (isUShape) {
      const minRailX = Math.min(a.x, z.x);
      const maxRailX = Math.max(a.x, z.x);
      const centerRailX = (a.x + z.x) / 2;

      elements.push(
        <line
          key={`edge-ushape-${edgeKey}`}
          x1={minRailX}
          y1={uShapeY}
          x2={maxRailX}
          y2={uShapeY}
          stroke="transparent"
          strokeWidth={18}
          style={{ cursor: "ns-resize" }}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => onEdgePointerDown(e, midKey, { x: centerRailX, y: uShapeY }, "y")}
        />,
      );
    } else if (isStepped || userBend) {
      elements.push(
        <line
          key={`edge-hdl-line-${edgeKey}`}
          x1={midX}
          y1={Math.min(a.y, z.y)}
          x2={midX}
          y2={Math.max(a.y, z.y)}
          stroke="transparent"
          strokeWidth={18}
          style={{ cursor: "ew-resize" }}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) =>
            onEdgePointerDown(e, edgeKey, { x: midX, y: (a.y + z.y) / 2 }, isStepped ? "x" : "both")
          }
        />,
      );
    }

    if (r.edge.label) {
      const badgeW = r.edge.label.length * 6.5 + 14;
      const lblX = midX;
      const lblY = isUShape ? uShapeY : (a.y + z.y) / 2;
      elements.push(
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

  return <>{elements}</>;
}
