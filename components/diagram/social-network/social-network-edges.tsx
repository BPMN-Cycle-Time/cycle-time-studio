"use client";

import React from "react";
import { type SocialMetricType, type SocialNetworkEdge } from "@/types";

export interface SocialNodePos {
  x: number;
  y: number;
  label: string;
  color: string;
}

interface SocialNetworkEdgesProps {
  edges: SocialNetworkEdge[];
  nodeMap: Map<string, SocialNodePos>;
  metric: SocialMetricType;
  selectedNodeId: string | null;
  maxEdgeWeight: number;
}

const NODE_RADIUS = 24.5;
const ARROW_LEN = 8.5;
const ARROW_HALF_WIDTH = 3.8;

export const SocialNetworkEdges = React.memo(function SocialNetworkEdges({
  edges,
  nodeMap,
  metric,
  selectedNodeId,
  maxEdgeWeight,
}: SocialNetworkEdgesProps) {
  return (
    <g className="edges-layer">
      {edges.map((edge) => {
        const s = nodeMap.get(edge.source);
        const t = nodeMap.get(edge.target);
        if (!s || !t) return null;

        const isConnected =
          !selectedNodeId || edge.source === selectedNodeId || edge.target === selectedNodeId;

        const strokeWidth = Math.max(
          1.2,
          Math.min(3.2, 1.2 + (edge.weight / (maxEdgeWeight || 1)) * 2.0),
        );

        // Curved path calculation
        const dx = t.x - s.x;
        const dy = t.y - s.y;
        const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const nx = -dy / dist;
        const ny = dx / dist;

        const curvature = metric === "handover" ? 26 : 0;
        const mx = (s.x + t.x) / 2 + nx * curvature;
        const my = (s.y + t.y) / 2 + ny * curvature;

        // Vector leaving source towards control point M
        const dsx = mx - s.x;
        const dsy = my - s.y;
        const dslen = Math.max(1, Math.sqrt(dsx * dsx + dsy * dsy));
        const sx = s.x + (dsx / dslen) * NODE_RADIUS;
        const sy = s.y + (dsy / dslen) * NODE_RADIUS;

        // Vector entering target from control point M
        const dtx = t.x - mx;
        const dty = t.y - my;
        const dtlen = Math.max(1, Math.sqrt(dtx * dtx + dty * dty));
        const ux = dtx / dtlen;
        const uy = dty / dtlen;

        // Arrowhead tip touches target circle perimeter
        const tipX = t.x - ux * NODE_RADIUS;
        const tipY = t.y - uy * NODE_RADIUS;

        // Arrowhead base center is ARROW_LEN back along the incoming vector
        const baseX = tipX - ux * ARROW_LEN;
        const baseY = tipY - uy * ARROW_LEN;

        // Perpendicular vector for arrowhead wings
        const perpX = -uy;
        const perpY = ux;

        const w1x = baseX + perpX * ARROW_HALF_WIDTH;
        const w1y = baseY + perpY * ARROW_HALF_WIDTH;
        const w2x = baseX - perpX * ARROW_HALF_WIDTH;
        const w2y = baseY - perpY * ARROW_HALF_WIDTH;

        // The path line stops cleanly inside the arrowhead base, never reaching the tip
        const endX = metric === "handover" ? baseX + ux * 1.2 : tipX;
        const endY = metric === "handover" ? baseY + uy * 1.2 : tipY;

        const pathData =
          curvature > 0
            ? `M ${sx} ${sy} Q ${mx} ${my} ${endX} ${endY}`
            : `M ${sx} ${sy} L ${endX} ${endY}`;

        // Weight badge location at curve apex
        const badgeX = (s.x + t.x) / 2 + nx * (curvature * 0.62);
        const badgeY = (s.y + t.y) / 2 + ny * (curvature * 0.62);

        const isHighlight =
          selectedNodeId && (edge.source === selectedNodeId || edge.target === selectedNodeId);

        return (
          <g
            key={edge.id}
            className={`transition-opacity duration-200 ${
              isConnected ? "opacity-100" : "opacity-15"
            }`}
          >
            {/* The edge curve */}
            <path
              d={pathData}
              fill="none"
              stroke={isHighlight ? "var(--primary)" : "currentColor"}
              strokeWidth={strokeWidth}
              strokeLinecap="butt"
              className={
                isHighlight
                  ? "text-primary"
                  : "text-border/90 hover:text-muted-foreground transition-colors"
              }
            />

            {/* The sleek arrowhead polygon (rendered on top, line stops inside base) */}
            {metric === "handover" && (
              <polygon
                points={`${tipX},${tipY} ${w1x},${w1y} ${w2x},${w2y}`}
                fill={isHighlight ? "var(--primary)" : "currentColor"}
                className={
                  isHighlight
                    ? "text-primary fill-primary"
                    : "text-muted-foreground/80 dark:text-muted-foreground/70 fill-current"
                }
              />
            )}

            {/* Weight Badge */}
            <g transform={`translate(${badgeX}, ${badgeY})`}>
              <rect
                x="-12"
                y="-8"
                width="24"
                height="16"
                rx="8"
                className="fill-card stroke-border/80"
                strokeWidth="1"
              />
              <text
                x="0"
                y="3.5"
                textAnchor="middle"
                className="text-[10px] font-mono font-bold fill-foreground pointer-events-none select-none"
              >
                {edge.weight}
              </text>
            </g>
          </g>
        );
      })}
    </g>
  );
});
