"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/** Theme colours cycled for clusters / groups. */
export const GROUP_COLORS = [
  "var(--primary)",
  "var(--color-flow-xor)",
  "var(--color-flow-and)",
  "var(--color-flow-loop)",
  "var(--destructive)",
  "var(--muted-foreground)",
  "var(--color-flow-seq)",
];

export interface ScatterPoint {
  x: number;
  y: number;
  label: string;
  group: number;
  /** Stable id of the point (node id / case id). */
  id: string;
  /** Optional value shown in the tooltip (e.g. anomaly score). */
  detail?: string;
}

interface EmbeddingScatterProps {
  points: ScatterPoint[];
  groupName: (group: number) => string;
  showLabels?: boolean;
  height?: number;
  onPointClick?: (point: ScatterPoint) => void;
}

/** 2-D (PCA) scatter of embedding vectors, coloured by group. */
export function EmbeddingScatter({
  points,
  groupName,
  showLabels = true,
  height = 360,
  onPointClick,
}: EmbeddingScatterProps) {
  const groups = useMemo(() => {
    const byGroup = new Map<number, ScatterPoint[]>();
    for (const p of points) byGroup.set(p.group, [...(byGroup.get(p.group) ?? []), p]);
    return [...byGroup.entries()].sort(([a], [b]) => a - b);
  }, [points]);

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 12, right: 24, bottom: 8, left: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--muted-foreground)"
            strokeOpacity={0.15}
          />
          <XAxis
            type="number"
            dataKey="x"
            name="PC1"
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="PC2"
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
          />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            content={({ payload }) => {
              const p = payload?.[0]?.payload as ScatterPoint | undefined;
              if (!p) return null;
              return (
                <div className="rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs shadow-sm">
                  <div className="font-medium text-foreground">{p.label}</div>
                  <div className="text-muted-foreground">{groupName(p.group)}</div>
                  {p.detail && <div className="font-mono text-muted-foreground">{p.detail}</div>}
                </div>
              );
            }}
          />
          {groups.map(([group, data]) => (
            <Scatter
              key={group}
              name={groupName(group)}
              data={data}
              fill={GROUP_COLORS[group % GROUP_COLORS.length]}
              onClick={(entry) => {
                const point = (entry as { payload?: ScatterPoint }).payload;
                if (point && onPointClick) onPointClick(point);
              }}
              className={onPointClick ? "cursor-pointer" : undefined}
            >
              {showLabels && (
                <LabelList
                  dataKey="label"
                  position="top"
                  style={{ fontSize: 10, fill: "var(--foreground)" }}
                />
              )}
            </Scatter>
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
