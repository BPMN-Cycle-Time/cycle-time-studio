"use client";

import { useMemo, useRef, useState } from "react";
import type { DfgEdge, DfgNode } from "@/types";

interface DfgCanvasProps {
  nodes: DfgNode[];
  edges: DfgEdge[];
  width?: number;
  height?: number;
}

export function DfgCanvas({ nodes, edges, width = 760, height = 480 }: DfgCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const layout = useMemo(() => {
    if (nodes.length === 0) return { nodes: [], edges: [] };

    const maxFreq = Math.max(1, ...nodes.map((n) => n.frequency), ...edges.map((e) => e.frequency));

    // Simple layered layout: start nodes at top, others by topological BFS level
    const levels = new Map<string, number>();
    const outgoing = new Map<string, string[]>();
    const incoming = new Map<string, string[]>();

    for (const e of edges) {
      const out = outgoing.get(e.source) || [];
      out.push(e.target);
      outgoing.set(e.source, out);

      const inc = incoming.get(e.target) || [];
      inc.push(e.source);
      incoming.set(e.target, inc);
    }

    const queue = nodes
      .filter((n) => n.isStart || incoming.get(n.label)?.length === 0)
      .map((n) => n.label);
    const visited = new Set(queue);
    queue.forEach((label) => levels.set(label, 0));

    while (queue.length > 0) {
      const label = queue.shift()!;
      const level = levels.get(label) || 0;
      for (const next of outgoing.get(label) || []) {
        if (!visited.has(next)) {
          visited.add(next);
          levels.set(next, level + 1);
          queue.push(next);
        }
      }
    }

    // Assign any orphaned nodes to level 0
    for (const n of nodes) {
      if (!levels.has(n.label)) levels.set(n.label, 0);
    }

    const levelGroups = new Map<number, string[]>();
    for (const [label, level] of levels.entries()) {
      const group = levelGroups.get(level) || [];
      group.push(label);
      levelGroups.set(level, group);
    }

    const nodePositions = new Map<string, { x: number; y: number }>();
    const levelHeight = height / Math.max(1, levelGroups.size);
    const paddingX = 80;

    for (const [level, labels] of levelGroups.entries()) {
      const count = labels.length;
      const usableWidth = width - paddingX * 2;
      const stepX = count > 1 ? usableWidth / (count - 1) : 0;
      const startX = count > 1 ? paddingX : width / 2;

      labels.forEach((label, idx) => {
        nodePositions.set(label, {
          x: count > 1 ? startX + idx * stepX : startX,
          y: level * levelHeight + levelHeight / 2,
        });
      });
    }

    const positionedNodes = nodes.map((n) => ({
      ...n,
      ...(nodePositions.get(n.label) || { x: width / 2, y: height / 2 }),
      radius: 8 + (n.frequency / maxFreq) * 12,
    }));

    const positionedEdges = edges
      .map((e) => {
        const sourcePos = nodePositions.get(e.source);
        const targetPos = nodePositions.get(e.target);
        if (!sourcePos || !targetPos) return null;
        return {
          ...e,
          x1: sourcePos.x,
          y1: sourcePos.y,
          x2: targetPos.x,
          y2: targetPos.y,
          strokeWidth: 1 + (e.frequency / maxFreq) * 4,
        };
      })
      .filter((e): e is NonNullable<typeof e> => e !== null);

    return { nodes: positionedNodes, edges: positionedEdges };
  }, [nodes, edges, width, height]);

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
        No activities to display.
      </div>
    );
  }

  return (
    <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" className="fill-muted-foreground" />
        </marker>
      </defs>

      {layout.edges.map((e) => (
        <line
          key={`${e.source}->${e.target}`}
          x1={e.x1}
          y1={e.y1}
          x2={e.x2}
          y2={e.y2}
          stroke="currentColor"
          className="text-muted-foreground/60"
          strokeWidth={e.strokeWidth}
          markerEnd="url(#arrowhead)"
        />
      ))}

      {layout.nodes.map((n) => (
        <g
          key={n.id}
          transform={`translate(${n.x}, ${n.y})`}
          onMouseEnter={() => setHoveredNode(n.id)}
          onMouseLeave={() => setHoveredNode(null)}
          className="cursor-pointer"
        >
          <circle
            r={n.radius}
            className={`${
              n.isStart || n.isEnd
                ? "fill-primary stroke-primary-foreground"
                : "fill-card stroke-primary"
            } stroke-2`}
          />
          <text
            y={n.radius + 14}
            textAnchor="middle"
            className={`text-[10px] ${hoveredNode === n.id ? "fill-foreground font-medium" : "fill-muted-foreground"}`}
          >
            {n.label}
          </text>
          {hoveredNode === n.id && (
            <g transform="translate(10, -30)">
              <rect
                x="0"
                y="0"
                width="120"
                height="44"
                rx="6"
                className="fill-popover stroke-border"
              />
              <text x="8" y="16" className="text-[10px] fill-foreground font-medium">
                {n.label}
              </text>
              <text x="8" y="32" className="text-[9px] fill-muted-foreground">
                Freq: {n.frequency} {n.isStart ? "· Start" : ""} {n.isEnd ? "· End" : ""}
              </text>
            </g>
          )}
        </g>
      ))}
    </svg>
  );
}
