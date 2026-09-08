"use client";

import type { ReactNode } from "react";
import type { EdgeRoutingStyle } from "@/services/graph";
import type { ProcessGraph, ProcessGraphLayout, ProcessGraphNode } from "@/types";
import { GraphForwardEdges } from "./graph-forward-edges";
import { GraphBackEdges } from "./graph-back-edges";
import { GraphNodeRenderer } from "./graph-node-renderer";

export interface GraphSvgRendererProps {
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
    axis?: "x" | "y" | "both",
  ) => void;
  onPointerUp: (e: React.PointerEvent, n?: ProcessGraphNode) => void;
}

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
}: GraphSvgRendererProps): ReactNode {
  return (
    <>
      <GraphForwardEdges
        routed={layout.routed}
        customEdgeBends={customEdgeBends}
        routingStyle={routingStyle}
        draggingTargetId={draggingTargetId}
        getNodePos={getNodePos}
        onEdgePointerDown={onEdgePointerDown}
      />
      <GraphBackEdges
        edges={graph.edges}
        customEdgeBends={customEdgeBends}
        draggingTargetId={draggingTargetId}
        getNodePos={getNodePos}
        onEdgePointerDown={onEdgePointerDown}
      />
      <GraphNodeRenderer
        nodes={graph.nodes}
        getNodePos={getNodePos}
        selectedId={selectedId}
        draggingTargetId={draggingTargetId}
        onNodePointerDown={onNodePointerDown}
        onPointerUp={onPointerUp}
      />
    </>
  );
}
