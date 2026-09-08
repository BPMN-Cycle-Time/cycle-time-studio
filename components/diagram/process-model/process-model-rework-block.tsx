"use client";

import type { ReactNode } from "react";
import {
  leafTime,
  formatTimeValue,
  TASK_W,
  TASK_H,
  type BlockMeasurement,
  type FlowMeasurement,
} from "@/services/graph";
import { blockDisplayName } from "@/services/graph";
import { SelectionKind } from "@/store/useEditorStore";
import { renderTaskBox } from "./process-model-nodes";
import {
  getItemKey,
  getItemExitKey,
  buildRoundedOrthogonalPath,
  type ProcessModelRendererContext,
} from "./process-model-helpers";

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
  let targetX: number;
  let targetY: number;
  let sourceX: number;
  let sourceY: number;

  if ("single" in item.body && item.body.single) {
    const key = `rw-task-${b.id}`;
    const rwOff = ctx.customOffsets[key] || { dx: 0, dy: 0 };
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
    targetX = x + rwOff.dx;
    targetY = centerY - TASK_H / 2 + rwOff.dy;
    sourceX = targetX;
    sourceY = targetY;
  } else {
    renderFlowRecursiveFn(item.body as FlowMeasurement, x, centerY, out, ctx);
    const flow = item.body as FlowMeasurement;
    const firstKey = flow.items.length > 0 ? getItemKey(flow.items[0]!) : "";
    const lastKey = flow.items.length > 0 ? getItemExitKey(flow.items[flow.items.length - 1]!) : "";
    const firstOff = firstKey ? ctx.customOffsets[firstKey] || { dx: 0, dy: 0 } : { dx: 0, dy: 0 };
    const lastOff = lastKey ? ctx.customOffsets[lastKey] || { dx: 0, dy: 0 } : { dx: 0, dy: 0 };

    targetX = x + firstOff.dx;
    targetY = centerY - TASK_H / 2 + firstOff.dy;
    sourceX = x + item.w - TASK_W + lastOff.dx;
    sourceY = centerY - TASK_H / 2 + lastOff.dy;
  }

  const targetCx = targetX + TASK_W / 2;
  const sourceCx = sourceX + TASK_W / 2;
  const targetTop = targetY;
  const targetBottom = targetY + TASK_H;
  const sourceTop = sourceY;
  const sourceBottom = sourceY + TASK_H;

  const r = b.loopP ?? 0;
  const isBad = r >= 100;
  const arcColor = isBad ? "var(--destructive, #ad4326)" : strokeColor;

  const arcKey = `rw-loop-${b.id}`;
  const srcKey = `${arcKey}-src`;
  const tgtKey = `${arcKey}-tgt`;

  const bendMid = ctx.customEdgeBends?.[arcKey];
  const bendSrc = ctx.customEdgeBends?.[srcKey];
  const bendTgt = ctx.customEdgeBends?.[tgtKey] ?? ctx.customEdgeBends?.[arcKey];
  const userArcOffset = ctx.customOffsets[arcKey] || { dx: 0, dy: 0 };

  const defaultUnderneathY = Math.max(targetBottom, sourceBottom) + 36;
  let midY: number;
  if (bendMid?.y != null) {
    midY = bendMid.y;
  } else if (userArcOffset.dy !== 0) {
    midY = defaultUnderneathY + userArcOffset.dy;
  } else {
    midY = defaultUnderneathY;
  }

  const isUnderneath = midY >= Math.max(targetBottom, sourceBottom);

  // Right vertical segment (Source: e.g. Kiem tra chat luong)
  const rawSourceX = bendSrc?.x ?? sourceCx;
  const effectiveSourceX = Math.max(sourceX + 8, Math.min(sourceX + TASK_W - 8, rawSourceX));
  const startPt = { x: effectiveSourceX, y: isUnderneath ? sourceBottom : sourceTop };

  // Left vertical segment (Target: e.g. Dong goi)
  const rawVertX = bendTgt?.x ?? targetCx;
  let endPt: { x: number; y: number };
  let effectiveVertX: number;
  let loopPoints: Array<{ x: number; y: number }>;

  if (rawVertX < targetX) {
    effectiveVertX = rawVertX;
    endPt = { x: targetX, y: targetY + TASK_H / 2 };
    loopPoints = [
      startPt,
      { x: effectiveSourceX, y: midY },
      { x: effectiveVertX, y: midY },
      { x: effectiveVertX, y: endPt.y },
      endPt,
    ];
  } else {
    effectiveVertX = Math.max(targetX + 8, Math.min(targetX + TASK_W - 8, rawVertX));
    endPt = { x: effectiveVertX, y: isUnderneath ? targetBottom : targetTop };
    loopPoints = [startPt, { x: effectiveSourceX, y: midY }, { x: effectiveVertX, y: midY }, endPt];
  }

  const loopPathD = buildRoundedOrthogonalPath(loopPoints, 8);

  // Rework loop path
  out.push(
    <g key={arcKey} className={`hit ${isSelected ? "sel" : ""}`}>
      <path
        d={loopPathD}
        fill="none"
        stroke={arcColor}
        strokeWidth={1.5}
        markerEnd="url(#pm-arrow-rw)"
        style={{ pointerEvents: "none" }}
      />
      {/* Right vertical segment hit line exiting source: ew-resize */}
      <line
        x1={effectiveSourceX}
        y1={Math.min(startPt.y, midY)}
        x2={effectiveSourceX}
        y2={Math.max(startPt.y, midY)}
        stroke="transparent"
        strokeWidth={20}
        style={{ cursor: "ew-resize" }}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) =>
          ctx.onEdgePointerDown(e, srcKey, { x: effectiveSourceX, y: midY }, "x")
        }
      />
      {/* Horizontal segment hit line: ns-resize */}
      <line
        x1={Math.min(effectiveSourceX, effectiveVertX)}
        y1={midY}
        x2={Math.max(effectiveSourceX, effectiveVertX)}
        y2={midY}
        stroke="transparent"
        strokeWidth={20}
        style={{ cursor: "ns-resize" }}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => ctx.onEdgePointerDown(e, arcKey, { x: effectiveVertX, y: midY }, "y")}
      />
      {/* Left vertical segment hit line entering target: ew-resize */}
      <line
        x1={effectiveVertX}
        y1={Math.min(midY, endPt.y)}
        x2={effectiveVertX}
        y2={Math.max(midY, endPt.y)}
        stroke="transparent"
        strokeWidth={20}
        style={{ cursor: "ew-resize" }}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => ctx.onEdgePointerDown(e, tgtKey, { x: effectiveVertX, y: midY }, "x")}
      />
    </g>,
  );

  if (ctx.showIds && loopGid) {
    out.push(
      <text
        key={`loop-gid-${b.id}`}
        x={effectiveSourceX + 8}
        y={isUnderneath ? sourceBottom + 12 : sourceTop - 4}
        textAnchor="start"
        fontSize={8.5}
        fill="var(--muted-foreground, #6f7266)"
        fontFamily="ui-monospace, monospace"
        style={{ pointerEvents: "none" }}
      >
        {loopGid}
      </text>,
    );
  }

  // Rate or label along the horizontal channel
  const rValue = (r ?? 0) / 100;
  const loopLabelText = r > 0 ? `r = ${formatTimeValue(rValue)}` : "Lam lai";

  out.push(
    <g key={`lbl-${b.id}`} style={{ pointerEvents: "none" }}>
      <text
        x={(effectiveSourceX + effectiveVertX) / 2}
        y={isUnderneath ? midY + 15 : midY - 7}
        textAnchor="middle"
        fontSize={11}
        fill={arcColor}
        fontFamily="ui-monospace, monospace"
        fontWeight={600}
      >
        {loopLabelText}
      </text>
    </g>,
  );
}
