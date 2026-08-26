"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { Block, Task } from "@/types";
import { BlockType } from "@/types";
import { useEditorStore, SelectionKind } from "@/store/useEditorStore";
import { buildProcessGraph, measureProcessModelFlow, GAP, PAD } from "@/services/graph";
import { DiagramInspector } from "../diagram-inspector";
import { ImportGraphDialog } from "../import-graph-dialog";
import { DiagramViewport } from "../diagram-viewport";
import { renderFlowRecursive } from "./process-model-svg-renderer";
import { Checkbox } from "@/components/ui";
import "./process-model-panel.css";

interface ProcessModelPanelProps {
  blocks: Block[];
  tasks?: Task[];
  unit: string;
}

export function ProcessModelPanel({ blocks, tasks, unit }: ProcessModelPanelProps) {
  const t = useTranslations("diagram");
  const [showIds, setShowIds] = useState(true);
  const select = useEditorStore((s) => s.select);
  const selectedId = useEditorStore((s) => s.selectedId);
  const addBlock = useEditorStore((s) => s.addBlock);

  const graph = useMemo(() => buildProcessGraph(blocks, tasks), [blocks, tasks]);
  const layout = useMemo(() => measureProcessModelFlow(blocks), [blocks]);

  const unitShort = unit?.trim() ? ` ${unit.trim().slice(0, 1)}` : "";

  function graphIdOf(key: string): string {
    return graph.key[key] ?? "";
  }

  function handleNodeClick(kind: SelectionKind, id: string) {
    select(kind, id);
  }

  function handleInsertClick(targetId: string, pos: "before" | "after") {
    const idx = blocks.findIndex((b) => b.id === targetId);
    if (idx !== -1) {
      addBlock(BlockType.SEQ, pos === "before" ? idx - 1 : idx);
    } else {
      addBlock(BlockType.SEQ);
    }
  }

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
  const svgH = PAD + above + below + PAD;

  const startId = graph.key.start ?? "n1";
  const endId = graph.key.end ?? `n${graph.nodes.length}`;

  let currentX = PAD;
  const svgElements: ReactNode[] = [];

  // Start Event
  const startCx = currentX + 17;
  const startCy = centerY;
  svgElements.push(
    <g key="start-event" className="static">
      <circle
        cx={startCx}
        cy={startCy}
        r={17}
        fill="var(--card, #ffffff)"
        stroke="var(--foreground, #23261f)"
        strokeWidth={1.8}
      />
      {showIds && (
        <text
          x={startCx}
          y={startCy - 24}
          textAnchor="middle"
          fontSize={10}
          fill="var(--muted-foreground, #6f7266)"
          fontFamily="ui-monospace, monospace"
        >
          {startId}
        </text>
      )}
    </g>,
  );

  currentX += 34;

  // Insert before first block
  if (!layout.empty && layout.items.length > 0) {
    const firstBlockId = layout.items[0]!.block.id;
    svgElements.push(
      <g
        key="start-insert"
        className="ins"
        onClick={() => handleInsertClick(firstBlockId, "before")}
      >
        <circle
          cx={currentX + GAP / 2}
          cy={centerY}
          r={8}
          fill="var(--secondary, #ebe8e0)"
          stroke="var(--border, #ddd7c8)"
          strokeWidth={1}
        />
        <text
          x={currentX + GAP / 2}
          y={centerY + 4}
          textAnchor="middle"
          fontSize={12}
          fontWeight={700}
          fill="var(--muted-foreground, #6f7266)"
          fontFamily="ui-monospace, monospace"
        >
          +
        </text>
        <title>Insert block here</title>
      </g>,
    );
  }

  // Connecting arrow from start to first item
  svgElements.push(
    <line
      key="arrow-start"
      x1={currentX}
      y1={centerY}
      x2={currentX + GAP}
      y2={centerY}
      stroke="var(--foreground, #23261f)"
      strokeWidth={1.5}
      markerEnd="url(#pm-arrow)"
    />,
  );

  currentX += GAP;

  // Render main blocks flow
  renderFlowRecursive(
    layout,
    currentX,
    centerY,
    svgElements,
    showIds,
    selectedId,
    tasks,
    unitShort,
    graphIdOf,
    handleNodeClick,
    handleInsertClick,
  );

  currentX += layout.w;

  // Connecting arrow to end
  svgElements.push(
    <line
      key="arrow-end"
      x1={currentX}
      y1={centerY}
      x2={currentX + GAP}
      y2={centerY}
      stroke="var(--foreground, #23261f)"
      strokeWidth={1.5}
      markerEnd="url(#pm-arrow)"
    />,
  );

  // Insert after last block
  if (!layout.empty && layout.items.length > 0) {
    const lastBlockId = layout.items[layout.items.length - 1]!.block.id;
    svgElements.push(
      <g key="end-insert" className="ins" onClick={() => handleInsertClick(lastBlockId, "after")}>
        <circle
          cx={currentX + GAP / 2}
          cy={centerY}
          r={8}
          fill="var(--secondary, #ebe8e0)"
          stroke="var(--border, #ddd7c8)"
          strokeWidth={1}
        />
        <text
          x={currentX + GAP / 2}
          y={centerY + 4}
          textAnchor="middle"
          fontSize={12}
          fontWeight={700}
          fill="var(--muted-foreground, #6f7266)"
          fontFamily="ui-monospace, monospace"
        >
          +
        </text>
        <title>Insert block here</title>
      </g>,
    );
  }

  currentX += GAP;

  // End Event
  const endCx = currentX + 17;
  const endCy = centerY;
  svgElements.push(
    <g key="end-event" className="static">
      <circle
        cx={endCx}
        cy={endCy}
        r={17}
        fill="var(--card, #ffffff)"
        stroke="var(--foreground, #23261f)"
        strokeWidth={3}
      />
      {showIds && (
        <text
          x={endCx}
          y={endCy - 24}
          textAnchor="middle"
          fontSize={10}
          fill="var(--muted-foreground, #6f7266)"
          fontFamily="ui-monospace, monospace"
        >
          {endId}
        </text>
      )}
    </g>,
  );

  currentX += 34 + PAD;
  const svgW = Math.max(currentX, 600);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center justify-between gap-4 mb-2 shrink-0">
        <label className="inline-flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none font-medium">
          <Checkbox checked={showIds} onCheckedChange={(checked) => setShowIds(checked === true)} />
          <span>{t("stampNodeIds")}</span>
        </label>
        <div className="shrink-0">
          <ImportGraphDialog />
        </div>
      </div>

      <div className="border rounded-lg bg-card p-4 shadow-sm flex-1 flex flex-col min-h-[420px] overflow-hidden">
        <DiagramViewport contentWidth={svgW} contentHeight={svgH} className="flex-1 w-full">
          <svg
            viewBox={`0 0 ${svgW} ${svgH}`}
            width={svgW}
            height={svgH}
            role="img"
            aria-label="Process Model Diagram"
          >
            <defs>
              <marker
                id="pm-arrow"
                viewBox="0 0 10 10"
                refX={8}
                refY={5}
                markerWidth={7}
                markerHeight={7}
                orient="auto"
              >
                <path d="M0,0 L10,5 L0,10 z" fill="var(--foreground, #23261f)" />
              </marker>
              <marker
                id="pm-arrow-rw"
                viewBox="0 0 10 10"
                refX={8}
                refY={5}
                markerWidth={7}
                markerHeight={7}
                orient="auto"
              >
                <path d="M0,0 L10,5 L0,10 z" fill="var(--c-rework, #8b5a72)" />
              </marker>
            </defs>
            {svgElements}
          </svg>
        </DiagramViewport>

        <DiagramInspector />

        <p className="text-xs text-muted-foreground mt-3 shrink-0 font-sans">
          {t("processModelNotice")}
        </p>
      </div>
    </div>
  );
}
