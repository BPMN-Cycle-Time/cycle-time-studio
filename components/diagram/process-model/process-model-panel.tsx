"use client";

import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Download, RotateCcw } from "lucide-react";
import type { Block, Task } from "@/types";
import { useEditorStore, SelectionKind } from "@/store/useEditorStore";
import {
  buildProcessGraph,
  measureProcessModelFlow,
  EdgeRoutingStyle,
  snapCoordinate,
  GAP,
  PAD,
} from "@/services/graph";
import { exportSvgToPng, slugify } from "@/utils";
import { DiagramInspector } from "../diagram-inspector";
import { ImportGraphDialog } from "../import-graph-dialog";
import { ExportGraphDialog } from "../export-graph-dialog";
import { DiagramViewport } from "../diagram-viewport";
import { DiagramGuidelines, type ActiveGuideline } from "../diagram-guidelines";
import { DiagramRoutingSwitcher } from "../diagram-routing-switcher";
import { ProcessModelFlowRenderer } from "./process-model-svg-renderer";
import { ProcessModelStartEndpoint, ProcessModelEndEndpoint } from "./process-model-endpoints";
import { Checkbox, AppLabel, Card, Button } from "@/components/ui";
import "./process-model-panel.css";

interface ProcessModelPanelProps {
  blocks: Block[];
  tasks?: Task[];
  unit: string;
}

export function ProcessModelPanel({ blocks, tasks, unit }: ProcessModelPanelProps) {
  const t = useTranslations("diagram");
  const [showIds, setShowIds] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [routingStyle, setRoutingStyle] = useState<EdgeRoutingStyle>(EdgeRoutingStyle.ORTHOGONAL);
  const [customOffsets, setCustomOffsets] = useState<Record<string, { dx: number; dy: number }>>(
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
    startDx: number;
    startDy: number;
    startX: number;
    startY: number;
    hasMoved: boolean;
  } | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const projectName = useEditorStore((s) => s.project?.name);
  const select = useEditorStore((s) => s.select);
  const selectedId = useEditorStore((s) => s.selectedId);
  const insertBlockRelative = useEditorStore((s) => s.insertBlockRelative);

  const graph = useMemo(() => buildProcessGraph(blocks, tasks), [blocks, tasks]);
  const layout = useMemo(() => measureProcessModelFlow(blocks), [blocks]);

  const unitShort = unit?.trim() ? ` ${unit.trim().slice(0, 1)}` : "";

  const stopDragging = useCallback(() => {
    dragRef.current = null;
    setDraggingTargetId(null);
    setGuideline(null);
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, targetKey: string) => {
      e.stopPropagation();
      const currentOff = customOffsets[targetKey] || { dx: 0, dy: 0 };
      dragRef.current = {
        targetType: "node",
        id: targetKey,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startDx: currentOff.dx,
        startDy: currentOff.dy,
        startX: 0,
        startY: 0,
        hasMoved: false,
      };
      try {
        (e.target as Element).setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      setDraggingTargetId(targetKey);
    },
    [customOffsets],
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
        startDx: 0,
        startDy: 0,
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
      const dX = e.clientX - dragRef.current.startClientX;
      const dY = e.clientY - dragRef.current.startClientY;
      if (Math.abs(dX) > 2 || Math.abs(dY) > 2) {
        dragRef.current.hasMoved = true;
      }

      if (dragRef.current.targetType === "edge") {
        const newX = Math.max(10, Math.round(dragRef.current.startX + dX));
        const newY = Math.max(10, Math.round(dragRef.current.startY + dY));
        const targetId = dragRef.current.id;

        setCustomEdgeBends((prev) => ({
          ...prev,
          [targetId]: { x: newX, y: newY },
        }));
      } else {
        const newDx = Math.round(dragRef.current.startDx + dX);
        let newDy = Math.round(dragRef.current.startDy + dY);
        const targetId = dragRef.current.id;

        // Snap to baseline dy = 0 if close
        const snapY = snapCoordinate(newDy, 0, 8);
        if (snapY.snapped) {
          newDy = 0;
          setGuideline({
            y: PAD + Math.max(layout.center, 20),
            canvasWidth: layout?.w ? layout.w + 400 : 900,
            canvasHeight: layout?.h ? layout.h + 300 : 600,
          });
        } else {
          setGuideline(null);
        }

        setCustomOffsets((prev) => ({
          ...prev,
          [targetId]: { dx: newDx, dy: newDy },
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
  }, [draggingTargetId, layout, stopDragging]);

  const handleNodePointerUp = useCallback(
    (e: React.PointerEvent, kind: SelectionKind, id: string) => {
      const wasDrag = dragRef.current?.hasMoved;
      try {
        if (e.target) (e.target as Element).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      stopDragging();

      if (!wasDrag) {
        select(kind, id);
      }
    },
    [select, stopDragging],
  );

  const handleArcPointerUp = useCallback(
    (e: React.PointerEvent) => {
      try {
        if (e.target) (e.target as Element).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      stopDragging();
    },
    [stopDragging],
  );

  const handleResetLayout = useCallback(() => {
    setCustomOffsets({});
    setCustomEdgeBends({});
  }, []);

  const handleExportPng = useCallback(async () => {
    if (!svgRef.current) return;
    setExporting(true);
    try {
      const fileName = `${slugify(projectName)}-process-model.png`;
      await exportSvgToPng(svgRef.current, fileName);
    } finally {
      setExporting(false);
    }
  }, [projectName]);

  const graphIdOf = useCallback((key: string): string => graph.key[key] ?? "", [graph.key]);

  const handleInsertClick = useCallback(
    (targetId: string, pos: "before" | "after") => {
      insertBlockRelative(targetId, pos);
    },
    [insertBlockRelative],
  );

  if (blocks.length === 0) {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <div className="h-[420px] flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground border rounded-lg border-dashed p-6 text-center">
          <p className="max-w-md">{t("processModelEmpty")}</p>
          <ImportGraphDialog />
        </div>
      </div>
    );
  }

  const above = Math.max(layout.center, 20);
  const below = Math.max(layout.h - layout.center, 20);
  const centerY = PAD + above;
  let maxW = PAD;
  let maxH = PAD + above + below + PAD;

  const startId = graph.key.start ?? "n1";
  const endId = graph.key.end ?? `n${graph.nodes.length}`;

  const startKey = "start-event";
  const endKey = "end-event";
  const startOff = customOffsets[startKey] || { dx: 0, dy: 0 };
  const endOff = customOffsets[endKey] || { dx: 0, dy: 0 };

  const startCx = PAD + 17 + startOff.dx;
  const startCy = centerY + startOff.dy;

  const flowStartX = PAD + 34 + GAP;

  const firstItem = layout.items[0];
  const firstKey = firstItem
    ? firstItem.kind === "task"
      ? `task-${firstItem.block.id}`
      : firstItem.kind === "gateway"
        ? `split-gw-${firstItem.block.id}`
        : `rw-task-${firstItem.block.id}`
    : null;
  const firstOff = firstKey ? customOffsets[firstKey] || { dx: 0, dy: 0 } : { dx: 0, dy: 0 };

  const startArrowX1 = PAD + 34 + startOff.dx;
  const startArrowY1 = startCy;
  const startArrowX2 = flowStartX + firstOff.dx;
  const startArrowY2 = centerY + firstOff.dy;

  const flowEndX = flowStartX + layout.w;

  const lastItem = layout.items[layout.items.length - 1];
  const lastKey = lastItem
    ? lastItem.kind === "task"
      ? `task-${lastItem.block.id}`
      : lastItem.kind === "gateway"
        ? `join-gw-${lastItem.block.id}`
        : `rw-task-${lastItem.block.id}`
    : null;
  const lastOff = lastKey ? customOffsets[lastKey] || { dx: 0, dy: 0 } : { dx: 0, dy: 0 };

  const endArrowX1 = flowEndX + lastOff.dx;
  const endArrowY1 = centerY + lastOff.dy;
  const endArrowX2 = flowEndX + GAP + endOff.dx;
  const endArrowY2 = centerY + endOff.dy;

  const endCx = flowEndX + GAP + 17 + endOff.dx;
  const endCy = centerY + endOff.dy;

  const totalContentX = endCx + 17 + PAD;
  maxW = Math.max(totalContentX, 600);

  Object.values(customOffsets).forEach((off) => {
    if (Math.abs(off.dy) > 0) {
      const extraH = Math.abs(off.dy) * 2;
      if (PAD + above + below + extraH + PAD > maxH) {
        maxH = PAD + above + below + extraH + PAD;
      }
    }
  });

  const hasCustomPositions =
    Object.keys(customOffsets).length > 0 || Object.keys(customEdgeBends).length > 0;

  return (
    <div className="w-full flex-1 flex flex-col gap-3">
      <div className="flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="text-xs text-muted-foreground font-medium">
              {t("processModelTitle")}
            </div>
            <span className="text-[11px] text-muted-foreground/75 hidden sm:inline">
              — {t("dragNodeTip")}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 shrink-0 flex-wrap pt-0.5">
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <DiagramRoutingSwitcher style={routingStyle} onChange={setRoutingStyle} />
            <div className="flex items-center gap-2 ml-1">
              <Checkbox
                id="show-ids"
                checked={showIds}
                onCheckedChange={(c) => setShowIds(c === true)}
              />
              <AppLabel htmlFor="show-ids" className="text-xs cursor-pointer select-none">
                {t("showNodeIds")}
              </AppLabel>
            </div>
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

      <Card className="p-4 gap-4 w-full flex-1 min-h-[480px] flex flex-col overflow-hidden">
        <DiagramViewport
          contentWidth={maxW}
          contentHeight={maxH}
          className="flex-1 w-full min-h-[440px]"
        >
          <svg
            ref={svgRef}
            viewBox={`0 0 ${maxW} ${maxH}`}
            width={maxW}
            height={maxH}
            role="img"
            aria-label="Process Model Diagram"
            onPointerUp={stopDragging}
          >
            <defs>
              <marker
                id="pm-arrow"
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
                id="pm-arrow-rw"
                viewBox="0 0 10 10"
                refX={7}
                refY={5}
                markerWidth={6.5}
                markerHeight={6.5}
                orient="auto"
              >
                <path d="M 1.5 1.8 L 8 5 L 1.5 8.2 z" fill="var(--c-rework, #8b5a72)" />
              </marker>
            </defs>
            <DiagramGuidelines guideline={guideline} />
            <ProcessModelStartEndpoint
              startCx={startCx}
              startCy={startCy}
              startId={startId}
              showIds={showIds}
              startArrowX1={startArrowX1}
              startArrowY1={startArrowY1}
              startArrowX2={startArrowX2}
              startArrowY2={startArrowY2}
              firstBlockId={firstItem?.block.id ?? null}
              draggingTargetId={draggingTargetId}
              onPointerDown={handlePointerDown}
              onPointerUp={handleArcPointerUp}
              onInsertClick={handleInsertClick}
            />
            <ProcessModelFlowRenderer
              layout={layout}
              startX={flowStartX}
              centerY={centerY}
              customOffsets={customOffsets}
              customEdgeBends={customEdgeBends}
              routingStyle={routingStyle}
              draggingTargetId={draggingTargetId}
              selectedId={selectedId}
              showIds={showIds}
              tasks={tasks}
              unitShort={unitShort}
              graphIdOf={graphIdOf}
              onNodePointerDown={handlePointerDown}
              onNodePointerUp={handleNodePointerUp}
              onEdgePointerDown={handleEdgePointerDown}
              onArcPointerDown={handlePointerDown}
              onArcPointerUp={handleArcPointerUp}
              onInsertClick={handleInsertClick}
            />
            <ProcessModelEndEndpoint
              endCx={endCx}
              endCy={endCy}
              endId={endId}
              showIds={showIds}
              endArrowX1={endArrowX1}
              endArrowY1={endArrowY1}
              endArrowX2={endArrowX2}
              endArrowY2={endArrowY2}
              lastBlockId={lastItem?.block.id ?? null}
              draggingTargetId={draggingTargetId}
              onPointerDown={handlePointerDown}
              onPointerUp={handleArcPointerUp}
              onInsertClick={handleInsertClick}
            />
          </svg>
        </DiagramViewport>
      </Card>

      <DiagramInspector />
    </div>
  );
}
