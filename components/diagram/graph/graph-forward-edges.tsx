"use client";

import type { ReactNode } from "react";
import { GN_R, EdgeRoutingStyle, buildCustomPath } from "@/services/graph";
import { buildRoundedOrthogonalPath } from "../process-model/process-model-helpers";
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
    const a = getNodePos(r.edge.s);
    const z = getNodePos(r.edge.t);
    if (!a || !z) return;

    // Canonical edgeKey based on source and target
    const edgeKey = `fwd-${r.edge.s}-${r.edge.t}`;
    const legacyKey = `fwd-${r.edge.s}-${r.edge.t}-${idx}`;
    const userBend = customEdgeBends?.[edgeKey] ?? customEdgeBends?.[legacyKey];

    const dx = z.x - a.x;
    const dy = z.y - a.y;

    const defaultMidX = (a.x + z.x) / 2;
    const defaultMidY = (a.y + z.y) / 2;
    const midX = userBend?.x != null ? userBend.x : defaultMidX;
    const midY = userBend?.y != null ? userBend.y : defaultMidY;
    const userY = userBend?.y;

    let d: string;
    let waypoints: Array<{ x: number; y: number }> = [];
    const segInfo: Array<{ key: string; axis: "x" | "y" }> = [];

    if (routingStyle === EdgeRoutingStyle.ORTHOGONAL) {
      // 1. Vertical stack: Target directly above source (e.g. n1 at bottom, n2 above)
      if (dy < -GN_R * 1.2 && Math.abs(dx) < GN_R * 1.5) {
        const startX = a.x;
        const startY = a.y - GN_R;
        const endX = z.x;
        const endY = z.y + GN_R + 3;

        if (Math.abs(dx) <= 2 && userBend?.x == null) {
          waypoints = [
            { x: startX, y: startY },
            { x: endX, y: endY },
          ];
          segInfo.push({ key: edgeKey, axis: "x" });
        } else {
          const elbowY = userY != null ? userY : (startY + endY) / 2;
          waypoints = [
            { x: startX, y: startY },
            { x: startX, y: elbowY },
            { x: endX, y: elbowY },
            { x: endX, y: endY },
          ];
          segInfo.push(
            { key: edgeKey, axis: "x" },
            { key: edgeKey, axis: "y" },
            { key: edgeKey, axis: "x" },
          );
        }
      }
      // 2. Vertical stack: Target directly below source
      else if (dy > GN_R * 1.2 && Math.abs(dx) < GN_R * 1.5) {
        const startX = a.x;
        const startY = a.y + GN_R;
        const endX = z.x;
        const endY = z.y - (GN_R + 3);

        if (Math.abs(dx) <= 2 && userBend?.x == null) {
          waypoints = [
            { x: startX, y: startY },
            { x: endX, y: endY },
          ];
          segInfo.push({ key: edgeKey, axis: "x" });
        } else {
          const elbowY = userY != null ? userY : (startY + endY) / 2;
          waypoints = [
            { x: startX, y: startY },
            { x: startX, y: elbowY },
            { x: endX, y: elbowY },
            { x: endX, y: endY },
          ];
          segInfo.push(
            { key: edgeKey, axis: "x" },
            { key: edgeKey, axis: "y" },
            { key: edgeKey, axis: "x" },
          );
        }
      }
      // 3. Target is Forward (dx > 0)
      else if (dx > 0) {
        // If user dragged horizontal line below target/source
        if (userY != null && userY > Math.max(a.y, z.y) + GN_R + 4) {
          const startX = a.x;
          const startY = a.y + GN_R;
          const endX = z.x;
          const endY = z.y + GN_R + 3;
          waypoints = [
            { x: startX, y: startY },
            { x: startX, y: userY },
            { x: endX, y: userY },
            { x: endX, y: endY },
          ];
          segInfo.push(
            { key: edgeKey, axis: "x" },
            { key: edgeKey, axis: "y" },
            { key: edgeKey, axis: "x" },
          );
        }
        // If user dragged horizontal line above target/source
        else if (userY != null && userY < Math.min(a.y, z.y) - GN_R - 4) {
          const startX = a.x;
          const startY = a.y - GN_R;
          const endX = z.x;
          const endY = z.y - (GN_R + 3);
          waypoints = [
            { x: startX, y: startY },
            { x: startX, y: userY },
            { x: endX, y: userY },
            { x: endX, y: endY },
          ];
          segInfo.push(
            { key: edgeKey, axis: "x" },
            { key: edgeKey, axis: "y" },
            { key: edgeKey, axis: "x" },
          );
        }
        // Standard Left-to-Right
        else {
          const startX = a.x + GN_R;
          const startY = a.y;
          const endX = z.x - (GN_R + 3);
          const endY = z.y;

          if (Math.abs(startY - endY) <= 4 && userBend?.x == null) {
            waypoints = [
              { x: startX, y: startY },
              { x: endX, y: endY },
            ];
            segInfo.push({ key: edgeKey, axis: "y" });
          } else {
            const elbowX = Math.max(startX + 4, Math.min(endX - 4, midX));
            waypoints = [
              { x: startX, y: startY },
              { x: elbowX, y: startY },
              { x: elbowX, y: endY },
              { x: endX, y: endY },
            ];
            segInfo.push(
              { key: edgeKey, axis: "y" },
              { key: edgeKey, axis: "x" },
              { key: edgeKey, axis: "y" },
            );
          }
        }
      }
      // 4. Backward forward edge (Target is behind source)
      else {
        const uShapeY = userY != null ? userY : Math.max(a.y, z.y) + GN_R + 24;
        const startX = a.x;
        const startY = a.y + GN_R;
        const endX = z.x;
        const endY = z.y + GN_R + 3;
        waypoints = [
          { x: startX, y: startY },
          { x: startX, y: uShapeY },
          { x: endX, y: uShapeY },
          { x: endX, y: endY },
        ];
        segInfo.push(
          { key: edgeKey, axis: "x" },
          { key: edgeKey, axis: "y" },
          { key: edgeKey, axis: "x" },
        );
      }

      d = buildRoundedOrthogonalPath(waypoints, 8);
    } else {
      let sx: number, sy: number, ex: number, ey: number;
      if (Math.abs(dx) < GN_R * 1.5 && dy < -GN_R) {
        sx = a.x;
        sy = a.y - GN_R;
        ex = z.x;
        ey = z.y + GN_R + 3;
      } else if (Math.abs(dx) < GN_R * 1.5 && dy > GN_R) {
        sx = a.x;
        sy = a.y + GN_R;
        ex = z.x;
        ey = z.y - (GN_R + 3);
      } else {
        const dx1 = midX - a.x;
        const dy1 = midY - a.y;
        const len1 = Math.hypot(dx1, dy1) || 1;
        sx = a.x + (dx1 / len1) * GN_R;
        sy = a.y + (dy1 / len1) * GN_R;

        const dx2 = z.x - midX;
        const dy2 = z.y - midY;
        const len2 = Math.hypot(dx2, dy2) || 1;
        ex = z.x - (dx2 / len2) * (GN_R + 3);
        ey = z.y - (dy2 / len2) * (GN_R + 3);
      }

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

    // Render interactive hit lines for both horizontal and vertical segments
    for (let sIdx = 0; sIdx < waypoints.length - 1; sIdx++) {
      const pA = waypoints[sIdx]!;
      const pB = waypoints[sIdx + 1]!;
      const isVertical = Math.abs(pA.x - pB.x) < 0.5 && Math.abs(pA.y - pB.y) > 6;
      const isHorizontal = Math.abs(pA.y - pB.y) < 0.5 && Math.abs(pA.x - pB.x) > 6;

      const info = segInfo[sIdx] || { key: edgeKey, axis: isHorizontal ? "y" : "x" };

      if (isVertical) {
        const segMinY = Math.min(pA.y, pB.y);
        const segMaxY = Math.max(pA.y, pB.y);
        const segMidY = (segMinY + segMaxY) / 2;
        elements.push(
          <line
            key={`fwd-vert-${edgeKey}-${sIdx}`}
            x1={pA.x}
            y1={segMinY}
            x2={pA.x}
            y2={segMaxY}
            stroke="transparent"
            strokeWidth={18}
            style={{ cursor: "ew-resize" }}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => onEdgePointerDown(e, info.key, { x: pA.x, y: segMidY }, "x")}
          />,
        );
      } else if (isHorizontal) {
        const segMinX = Math.min(pA.x, pB.x);
        const segMaxX = Math.max(pA.x, pB.x);
        const segMidX = (segMinX + segMaxX) / 2;
        elements.push(
          <line
            key={`fwd-horiz-${edgeKey}-${sIdx}`}
            x1={segMinX}
            y1={pA.y}
            x2={segMaxX}
            y2={pA.y}
            stroke="transparent"
            strokeWidth={18}
            style={{ cursor: "ns-resize" }}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => onEdgePointerDown(e, info.key, { x: segMidX, y: pA.y }, "y")}
          />,
        );
      }
    }

    if (r.edge.label) {
      const badgeW = r.edge.label.length * 6.5 + 14;
      const lblX = midX;
      const lblY = userY != null ? userY : (a.y + z.y) / 2;
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
