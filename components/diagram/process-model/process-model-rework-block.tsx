"use client";

import type { ReactNode } from "react";
import {
  leafTime,
  formatTimeValue,
  TASK_W,
  TASK_H,
  LOOP_H,
  type BlockMeasurement,
  type FlowMeasurement,
} from "@/services/graph";
import { blockDisplayName } from "@/services/graph";
import { SelectionKind } from "@/store/useEditorStore";
import { renderTaskBox } from "./process-model-nodes";
import type { ProcessModelRendererContext } from "./process-model-helpers";

export function renderReworkBlock(
  item: Extract<BlockMeasurement, { kind: "rework" }>,
  x: number,
  centerY: number,
  out: ReactNode[],
  ctx: ProcessModelRendererContext,
  renderFlowRecursiveFn: (
    layout: FlowMeasurement,
    startX: number,
    centerY: number,
    out: ReactNode[],
    ctx: ProcessModelRendererContext,
  ) => void,
) {
  const b = item.block;
  const isSelected = ctx.selectedId === b.id;
  const strokeColor = "var(--c-rework, #8b5a72)";
  const fillColor = "var(--c-rework-soft, #ecdfe6)";
  const gid = ctx.graphIdOf(`block:${b.id}`);
  const loopGid = ctx.graphIdOf(`loop:${b.id}`);
  let bodyTop: number;
  let rwOff = { dx: 0, dy: 0 };

  if ("single" in item.body && item.body.single) {
    const key = `rw-task-${b.id}`;
    rwOff = ctx.customOffsets[key] || { dx: 0, dy: 0 };
    const timeVal = formatTimeValue(leafTime(b, "loopTime", ctx.tasks)) + ctx.unitShort;
    out.push(
      renderTaskBox(
        key,
        x + rwOff.dx,
        centerY - TASK_H / 2 + rwOff.dy,
        TASK_W,
        TASK_H,
        blockDisplayName(b, ctx.tasks),
        strokeColor,
        fillColor,
        timeVal,
        gid,
        ctx.showIds,
        isSelected,
        ctx.draggingTargetId === key,
        (e) => ctx.onNodePointerDown(e, key, SelectionKind.BLOCK, b.id),
        (e) => ctx.onNodePointerUp(e, SelectionKind.BLOCK, b.id),
      ),
    );
    bodyTop = centerY - TASK_H / 2 + rwOff.dy;
  } else {
    renderFlowRecursiveFn(item.body as FlowMeasurement, x, centerY, out, ctx);
    bodyTop = centerY - (item.body as FlowMeasurement).center;
  }

  const r = b.loopP ?? 0;
  const isBad = r >= 100;
  const arcColor = isBad ? "var(--destructive, #ad4326)" : strokeColor;

  const arcKey = `rw-loop-${b.id}`;
  const userArcOffset = ctx.customOffsets[arcKey] || { dx: 0, dy: 0 };
  const left = x + 14 + rwOff.dx;
  const right = x + item.w - 14 + rwOff.dx;
  const peakX = (left + right) / 2 + userArcOffset.dx;
  const midY = bodyTop - (LOOP_H - 14) + userArcOffset.dy;

  const arcD = `M ${right} ${bodyTop} C ${peakX + 28} ${midY} ${peakX - 28} ${midY} ${left} ${bodyTop}`;

  // Rework arc path with wide draggable hit stroke
  out.push(
    <g key={arcKey} className={`hit ${isSelected ? "sel" : ""}`}>
      <path
        d={arcD}
        fill="none"
        stroke="transparent"
        strokeWidth={16}
        style={{ cursor: "ns-resize" }}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => ctx.onArcPointerDown(e, arcKey)}
        onPointerUp={(e) => ctx.onArcPointerUp(e)}
      />
      <path
        d={arcD}
        fill="none"
        stroke={arcColor}
        strokeWidth={1.5}
        markerEnd="url(#pm-arrow-rw)"
        style={{ pointerEvents: "none" }}
      />
    </g>,
  );

  if (ctx.showIds && loopGid) {
    out.push(
      <text
        key={`loop-gid-${b.id}`}
        x={right - 2}
        y={bodyTop - 4}
        textAnchor="middle"
        fontSize={8.5}
        fill="var(--muted-foreground, #6f7266)"
        fontFamily="ui-monospace, monospace"
        style={{ pointerEvents: "none" }}
      >
        {loopGid}
      </text>,
    );
  }

  // Rate label above the peak with pointerEvents: none
  out.push(
    <g key={`lbl-${b.id}`} style={{ pointerEvents: "none" }}>
      <text
        x={peakX}
        y={midY - 11}
        textAnchor="middle"
        fontSize={11}
        fill={arcColor}
        fontFamily="ui-monospace, monospace"
        fontWeight={600}
      >
        r = {formatTimeValue(r)}%
      </text>
    </g>,
  );

  // Prominent draggable handle at arc peak with cursor: ns-resize
  const isDragging = ctx.draggingTargetId === arcKey;
  out.push(
    <circle
      key={`hdl-${b.id}`}
      cx={peakX}
      cy={midY}
      r={6}
      className={`edge-handle ${isDragging ? "dragging" : ""}`}
      style={{ cursor: "ns-resize" }}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => ctx.onArcPointerDown(e, arcKey)}
      onPointerUp={(e) => ctx.onArcPointerUp(e)}
    >
      <title>Drag up/down to adjust repeat loop arc height</title>
    </circle>,
  );
}
