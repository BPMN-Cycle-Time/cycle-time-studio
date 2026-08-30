"use client";

import { Button, Card } from "@/components/ui";
import {
  buildProcessGraph,
  layoutProcessGraph,
  EdgeRoutingStyle,
  snapCoordinate,
} from "@/services/graph";
import { SelectionKind, useEditorStore } from "@/store/useEditorStore";
import type { Block, ProcessGraphNode, Task } from "@/types";
import { exportSvgToPng, slugify } from "@/utils";
import { Download, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import { DiagramInspector } from "../diagram-inspector";
import { DiagramViewport } from "../diagram-viewport";
import { DiagramGuidelines, type ActiveGuideline } from "../diagram-guidelines";
import { DiagramRoutingSwitcher } from "../diagram-routing-switcher";
import { ImportGraphDialog } from "../import-graph-dialog";
import { ExportGraphDialog } from "../export-graph-dialog";
import { GraphSvgRenderer } from "./graph-svg-renderer";
import { GraphLegend } from "./graph-legend";
import "./graph-panel.css";

interface GraphPanelProps {
  blocks: Block[];
  tasks?: Task[];
}

export function GraphPanel({ blocks, tasks }: GraphPanelProps) {
  const t = useTranslations("diagram");
  const [exporting, setExporting] = useState(false);
  const [routingStyle, setRoutingStyle] = useState<EdgeRoutingStyle>(EdgeRoutingStyle.ORTHOGONAL);
  const [customPositions, setCustomPositions] = useState<Record<string, { x: number; y: number }>>(
    {},
  );
  const [customEdgeBends, setCustomEdgeBends] = useState<Record<string, { x: number; y: number }>>(
    {},
  );
  const [draggingTargetId, setDraggingTargetId] = useState<string | null>(null);
  const [guideline, setGuideline] = useState<ActiveGuideline | null>(null);

  const dragRef = useRef<{
    targetType: "node" | "edge";
    id: string;
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
    hasMoved: boolean;
  } | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const projectName = useEditorStore((s) => s.project?.name);
  const selectedId = useEditorStore((s) => s.selectedId);
  const select = useEditorStore((s) => s.select);

  const graph = useMemo(() => buildProcessGraph(blocks, tasks), [blocks, tasks]);
  const layout = useMemo(() => layoutProcessGraph(graph), [graph]);

  const getNodePos = useCallback(
    (id: string) => customPositions[id] || layout?.xy[id] || { x: 0, y: 0 },
    [customPositions, layout],
  );

  const stopDragging = useCallback(() => {
    dragRef.current = null;
    setDraggingTargetId(null);
    setGuideline(null);
  }, []);

  const handleNodePointerDown = useCallback(
    (e: React.PointerEvent, nodeId: string) => {
      e.stopPropagation();
      const currentPos = getNodePos(nodeId);
      dragRef.current = {
        targetType: "node",
        id: nodeId,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startX: currentPos.x,
        startY: currentPos.y,
        hasMoved: false,
      };
      try {
        (e.target as Element).setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      setDraggingTargetId(nodeId);
    },
    [getNodePos],
  );

  const handleEdgePointerDown = useCallback(
    (e: React.PointerEvent, edgeKey: string, defaultPos: { x: number; y: number }) => {
      e.stopPropagation();
      const currentPos = customEdgeBends[edgeKey] || defaultPos;
      dragRef.current = {
        targetType: "edge",
        id: edgeKey,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startX: currentPos.x,
        startY: currentPos.y,
        hasMoved: false,
      };
      try {
        (e.target as Element).setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      setDraggingTargetId(edgeKey);
    },
    [customEdgeBends],
  );

  // Global window listeners while dragging with magnetic snapping & guidelines
  useEffect(() => {
    if (!draggingTargetId) return;

    const onWindowPointerMove = (e: PointerEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startClientX;
      const dy = e.clientY - dragRef.current.startClientY;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        dragRef.current.hasMoved = true;
      }

      if (dragRef.current.targetType === "edge") {
        const newX = Math.max(10, Math.round(dragRef.current.startX + dx));
        const newY = Math.max(10, Math.round(dragRef.current.startY + dy));
        const targetId = dragRef.current.id;

        setCustomEdgeBends((prev) => ({
          ...prev,
          [targetId]: { x: newX, y: newY },
        }));
      } else {
        let rawX = Math.max(10, Math.round(dragRef.current.startX + dx));
        let rawY = Math.max(10, Math.round(dragRef.current.startY + dy));
        const targetId = dragRef.current.id;

        // Magnetic Snapping check against nodes
        let activeX: number | undefined;
        let activeY: number | undefined;

        graph.nodes.forEach((n) => {
          if (n.id === targetId) return;
          const pos = customPositions[n.id] || layout?.xy[n.id];
          if (!pos) return;

          const snapX = snapCoordinate(rawX, pos.x, 8);
          if (snapX.snapped) {
            rawX = snapX.val;
            activeX = pos.x;
          }

          const snapY = snapCoordinate(rawY, pos.y, 8);
          if (snapY.snapped) {
            rawY = snapY.val;
            activeY = pos.y;
          }
        });

        if (activeX !== undefined || activeY !== undefined) {
          setGuideline({
            x: activeX,
            y: activeY,
            canvasWidth: layout?.width || 800,
            canvasHeight: layout?.height || 500,
          });
        } else {
          setGuideline(null);
        }

        setCustomPositions((prev) => ({
          ...prev,
          [targetId]: { x: rawX, y: rawY },
        }));
      }
    };

    const onWindowPointerUp = () => {
      stopDragging();
    };

    window.addEventListener("pointermove", onWindowPointerMove);
    window.addEventListener("pointerup", onWindowPointerUp);
    window.addEventListener("pointercancel", onWindowPointerUp);

    return () => {
      window.removeEventListener("pointermove", onWindowPointerMove);
      window.removeEventListener("pointerup", onWindowPointerUp);
      window.removeEventListener("pointercancel", onWindowPointerUp);
    };
  }, [draggingTargetId, graph.nodes, customPositions, layout, stopDragging]);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent, n?: ProcessGraphNode) => {
      const wasDrag = dragRef.current?.hasMoved;
      const isNode = dragRef.current?.targetType === "node";
      try {
        (e.target as Element).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      stopDragging();

      // If it was a clean click on a node (no dragging movement), select node in inspector
      if (!wasDrag && isNode && n?.owner) {
        select(n.owner.kind === "branch" ? SelectionKind.BRANCH : SelectionKind.BLOCK, n.owner.id);
      }
    },
    [select, stopDragging],
  );

  const handleResetLayout = useCallback(() => {
    setCustomPositions({});
    setCustomEdgeBends({});
  }, []);

  const handleExportPng = useCallback(async () => {
    if (!svgRef.current) return;
    setExporting(true);
    try {
      const fileName = `${slugify(projectName)}-directed-graph.png`;
      await exportSvgToPng(svgRef.current, fileName);
    } finally {
      setExporting(false);
    }
  }, [projectName]);

  const loopsCount = useMemo(() => graph.edges.filter((e) => e.back).length, [graph.edges]);

  const adjacencyLines = useMemo(() => {
    return graph.nodes.map((n) => {
      const targets = graph.edges.filter((e) => e.s === n.id).map((e) => e.t);
      return { id: n.id, targets: targets.length ? targets.join(", ") : "∅" };
    });
  }, [graph]);

  if (blocks.length === 0 || !layout) {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <div className="h-[420px] flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground border rounded-lg border-dashed p-6 text-center">
          <p className="max-w-md">{t("emptyGraph")}</p>
          <ImportGraphDialog />
        </div>
      </div>
    );
  }

  const hasCustomPositions =
    Object.keys(customPositions).length > 0 || Object.keys(customEdgeBends).length > 0;

  return (
    <div className="w-full flex-1 flex flex-col gap-4">
      <div className="flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="text-xs text-muted-foreground font-medium">
              {t("directedGraphTitle")}
            </div>
            <span className="text-[11px] text-muted-foreground/75 hidden sm:inline">
              — {t("dragNodeTip")}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 shrink-0 flex-wrap pt-0.5">
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <DiagramRoutingSwitcher style={routingStyle} onChange={setRoutingStyle} />
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {hasCustomPositions && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetLayout}
                className="h-8 text-xs font-medium"
              >
                <RotateCcw className="size-3.5 mr-1.5" />
                {t("resetLayout")}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPng}
              disabled={exporting}
              className="h-8 text-xs font-medium"
            >
              <Download className="size-3.5 mr-1.5" />
              {t("exportPng")}
            </Button>
            <ExportGraphDialog graph={graph} />
            <ImportGraphDialog />
          </div>
        </div>
      </div>

      <Card className="p-4 gap-4 w-full flex flex-col">
        <DiagramViewport
          contentWidth={layout.width}
          contentHeight={layout.height}
          className="w-full h-[460px] shrink-0"
        >
          <svg
            ref={svgRef}
            viewBox={`0 0 ${layout.width} ${layout.height}`}
            width={layout.width}
            height={layout.height}
            role="img"
            aria-label="Process Graph Diagram"
            onPointerUp={() => stopDragging()}
          >
            <defs>
              <marker
                id="gn-arrow"
                viewBox="0 0 10 10"
                refX={7}
                refY={5}
                markerWidth={6.5}
                markerHeight={6.5}
                orient="auto"
              >
                <path d="M 1.5 1.8 L 8 5 L 1.5 8.2 z" fill="var(--foreground, #23261f)" />
              </marker>
              <marker
                id="gn-arrow-back"
                viewBox="0 0 10 10"
                refX={7}
                refY={5}
                markerWidth={6.5}
                markerHeight={6.5}
                orient="auto"
              >
                <path d="M 1.5 1.8 L 8 5 L 1.5 8.2 z" fill="var(--gn-back, #8b5a72)" />
              </marker>
            </defs>
            <DiagramGuidelines guideline={guideline} />
            <GraphSvgRenderer
              graph={graph}
              layout={layout}
              customPositions={customPositions}
              customEdgeBends={customEdgeBends}
              routingStyle={routingStyle}
              draggingTargetId={draggingTargetId}
              selectedId={selectedId}
              getNodePos={getNodePos}
              onNodePointerDown={handleNodePointerDown}
              onEdgePointerDown={handleEdgePointerDown}
              onPointerUp={handlePointerUp}
            />
          </svg>
        </DiagramViewport>

        <GraphLegend graph={graph} adjacencyLines={adjacencyLines} loopsCount={loopsCount} />
      </Card>

      <DiagramInspector />
    </div>
  );
}
