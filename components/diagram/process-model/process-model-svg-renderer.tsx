"use client";

import type { ReactNode } from "react";
import { SelectionKind } from "@/store/useEditorStore";
import {
  blockDisplayName,
  leafTime,
  formatTimeValue,
  TASK_W,
  TASK_H,
  GAP,
  type FlowMeasurement,
  type BlockMeasurement,
} from "@/services/graph";
import { renderTaskBox } from "./process-model-nodes";
import {
  getItemKey,
  getItemExitKey,
  buildManhattanPath,
  type ProcessModelRendererContext,
} from "./process-model-helpers";
import { renderGatewayBlock } from "./process-model-gateway-block";
import { renderReworkBlock } from "./process-model-rework-block";

export type { ProcessModelRendererContext };

export interface ProcessModelFlowRendererProps extends ProcessModelRendererContext {
  layout: FlowMeasurement;
  startX: number;
  centerY: number;
}

export function ProcessModelFlowRenderer({
  layout,
  startX,
  centerY,
  ...ctx
}: ProcessModelFlowRendererProps) {
  const out: ReactNode[] = [];
  renderFlowRecursive(layout, startX, centerY, out, ctx);
  return <>{out}</>;
}

export function renderFlowRecursive(
  layout: FlowMeasurement,
  startX: number,
  centerY: number,
  out: ReactNode[],
  ctx: ProcessModelRendererContext,
) {
  if (layout.empty) return;

  let cx = startX;
  layout.items.forEach((item, i) => {
    const prevItem = i > 0 ? layout.items[i - 1] : null;
    const prevKey = prevItem ? getItemExitKey(prevItem) : null;
    const currKey = getItemKey(item);

    const prevOff = prevKey ? ctx.customOffsets[prevKey] || { dx: 0, dy: 0 } : { dx: 0, dy: 0 };
    const currOff = ctx.customOffsets[currKey] || { dx: 0, dy: 0 };

    if (i > 0 && prevItem) {
      const edgeKey = `seq-${item.block.id}-${i}`;
      const x1 = cx + prevOff.dx;
      const y1 = centerY + prevOff.dy;
      const x2 = cx + GAP + currOff.dx;
      const y2 = centerY + currOff.dy;

      const userBend = ctx.customEdgeBends?.[edgeKey];
      const defaultMidX = (x1 + x2) / 2;
      const elbowX = userBend ? userBend.x : defaultMidX;

      const d = buildManhattanPath(x1, y1, elbowX, x2, y2, 8);

      out.push(
        <g key={`seq-edge-group-${edgeKey}`}>
          <path
            d={d}
            fill="none"
            stroke="var(--foreground, #23261f)"
            strokeWidth={1.5}
            markerEnd="url(#pm-arrow)"
          />
        </g>,
      );

      // Wide hit area and drag handle on the vertical stepped channel
      if (Math.abs(y1 - y2) > 4) {
        const isDragging = ctx.draggingTargetId === edgeKey;
        const midY = (y1 + y2) / 2;
        out.push(
          <g key={`seq-hdl-group-${edgeKey}`}>
            <line
              x1={elbowX}
              y1={Math.min(y1, y2)}
              x2={elbowX}
              y2={Math.max(y1, y2)}
              stroke="transparent"
              strokeWidth={18}
              style={{ cursor: "ew-resize" }}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => ctx.onEdgePointerDown(e, edgeKey, { x: elbowX, y: midY })}
            />
            <circle
              cx={elbowX}
              cy={midY}
              r={5.5}
              className={`edge-handle ${isDragging ? "dragging" : ""}`}
              style={{ cursor: "ew-resize" }}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => ctx.onEdgePointerDown(e, edgeKey, { x: elbowX, y: midY })}
            >
              <title>Drag to shift vertical line left/right</title>
            </circle>
          </g>,
        );
      }

      // Plus insert button placed on horizontal segment without blocking vertical drag handle
      const isStepped = Math.abs(y1 - y2) > 4;
      const insX = isStepped ? (x1 + elbowX) / 2 : (x1 + x2) / 2;
      const insY = isStepped ? y1 : (y1 + y2) / 2;
      out.push(
        <g
          key={`ins-${item.block.id}-${i}`}
          className="ins"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => ctx.onInsertClick(item.block.id, "before")}
        >
          <circle
            cx={insX}
            cy={insY}
            r={7.5}
            fill="var(--secondary, #ebe8e0)"
            stroke="var(--border, #ddd7c8)"
            strokeWidth={1}
          />
          <text
            x={insX}
            y={insY + 4}
            textAnchor="middle"
            fontSize={11}
            fontWeight={700}
            fill="var(--muted-foreground, #6f7266)"
            fontFamily="ui-monospace, monospace"
          >
            +
          </text>
          <title>Insert block here</title>
        </g>,
      );
      cx += GAP;
    }

    renderBlockItem(item, cx, centerY, out, ctx);
    cx += item.w;
  });
}

export function renderBlockItem(
  item: BlockMeasurement,
  x: number,
  centerY: number,
  out: ReactNode[],
  ctx: ProcessModelRendererContext,
) {
  const b = item.block;
  const isSelected = ctx.selectedId === b.id;

  if (item.kind === "task") {
    const key = `task-${b.id}`;
    const off = ctx.customOffsets[key] || { dx: 0, dy: 0 };
    const gid = ctx.graphIdOf(`block:${b.id}`);
    const timeVal = formatTimeValue(leafTime(b, "time", ctx.tasks)) + ctx.unitShort;
    out.push(
      renderTaskBox(
        key,
        x + off.dx,
        centerY - TASK_H / 2 + off.dy,
        TASK_W,
        TASK_H,
        blockDisplayName(b, ctx.tasks),
        "var(--c-seq, #3d5a80)",
        "var(--c-seq-soft, #e2e8f1)",
        timeVal,
        gid,
        ctx.showIds,
        isSelected,
        ctx.draggingTargetId === key,
        (e) => ctx.onNodePointerDown(e, key, SelectionKind.BLOCK, b.id),
        (e) => ctx.onNodePointerUp(e, SelectionKind.BLOCK, b.id),
      ),
    );
    return;
  }

  if (item.kind === "rework") {
    renderReworkBlock(item, x, centerY, out, ctx, renderFlowRecursive);
    return;
  }

  if (item.kind === "gateway") {
    renderGatewayBlock(item, x, centerY, out, ctx, renderFlowRecursive);
  }
}
