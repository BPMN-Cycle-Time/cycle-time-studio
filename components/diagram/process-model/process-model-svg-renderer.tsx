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
  GW,
  type FlowMeasurement,
  type BlockMeasurement,
} from "@/services/graph";
import { renderTaskBox } from "./process-model-nodes";
import {
  getItemKey,
  getItemExitKey,
  buildRoundedOrthogonalPath,
  chooseSequentialPorts,
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

function getItemBox(
  item: BlockMeasurement,
  cx: number,
  centerY: number,
  off: { dx: number; dy: number },
  isSource: boolean,
): { x: number; y: number; w: number; h: number } {
  if (item.kind === "gateway") {
    if (isSource) {
      // Outgoing from Join Diamond
      return {
        x: cx - GW + off.dx,
        y: centerY - GW / 2 + off.dy,
        w: GW,
        h: GW,
      };
    }
    // Incoming to Split Diamond
    return {
      x: cx + GAP + off.dx,
      y: centerY - GW / 2 + off.dy,
      w: GW,
      h: GW,
    };
  }

  // Task or Rework
  if (isSource) {
    return {
      x: cx - TASK_W + off.dx,
      y: centerY - TASK_H / 2 + off.dy,
      w: TASK_W,
      h: TASK_H,
    };
  }
  return {
    x: cx + GAP + off.dx,
    y: centerY - TASK_H / 2 + off.dy,
    w: TASK_W,
    h: TASK_H,
  };
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
      const prevBox = getItemBox(prevItem, cx, centerY, prevOff, true);
      const currBox = getItemBox(item, cx, centerY, currOff, false);

      const { startPort, endPort } = chooseSequentialPorts(prevBox, currBox);
      const x1 = startPort.x;
      const y1 = startPort.y;
      const x2 = endPort.x;
      const y2 = endPort.y;

      const srcTop = prevBox.y;
      const srcBottom = prevBox.y + prevBox.h;
      const srcLeft = prevBox.x;
      const srcRight = prevBox.x + prevBox.w;
      const srcCenterX = prevBox.x + prevBox.w / 2;

      const tgtTop = currBox.y;
      const tgtBottom = currBox.y + currBox.h;
      const tgtLeft = currBox.x;
      const tgtRight = currBox.x + currBox.w;
      const tgtCenterX = currBox.x + currBox.w / 2;

      const srcKey = `${edgeKey}-s0`;
      const tgtKey = `${edgeKey}-s2`;
      const midKey = edgeKey;

      const bendMid = ctx.customEdgeBends?.[midKey];
      const bendS0 = ctx.customEdgeBends?.[srcKey];
      const bendS2 = ctx.customEdgeBends?.[tgtKey];

      let waypoints: Array<{ x: number; y: number }> = [];
      const segInfo: Array<{ key: string; axis: "x" | "y" }> = [];

      if (startPort.dir === "right" && endPort.dir === "left") {
        let exitPortX = bendS0?.x != null ? bendS0.x : srcCenterX;
        exitPortX = Math.max(srcLeft + 10, Math.min(srcRight - 10, exitPortX));

        let entryPortX = bendS2?.x != null ? bendS2.x : tgtCenterX;
        entryPortX = Math.max(tgtLeft + 10, Math.min(tgtRight - 10, entryPortX));

        const userY = bendS0?.y ?? bendS2?.y ?? bendMid?.y;

        // 1. Both below: user dragged below both cards
        if (userY != null && userY > Math.max(srcBottom, tgtBottom) + 4) {
          waypoints = [
            { x: exitPortX, y: srcBottom },
            { x: exitPortX, y: userY },
            { x: entryPortX, y: userY },
            { x: entryPortX, y: tgtBottom },
          ];
          segInfo.push(
            { key: srcKey, axis: "x" },
            { key: srcKey, axis: "y" },
            { key: tgtKey, axis: "x" },
          );
        }
        // 2. Both above: user dragged above both cards
        else if (userY != null && userY < Math.min(srcTop, tgtTop) - 4) {
          waypoints = [
            { x: exitPortX, y: srcTop },
            { x: exitPortX, y: userY },
            { x: entryPortX, y: userY },
            { x: entryPortX, y: tgtTop },
          ];
          segInfo.push(
            { key: srcKey, axis: "x" },
            { key: srcKey, axis: "y" },
            { key: tgtKey, axis: "x" },
          );
        }
        // 3. Target top from right of source
        else if (userY != null && userY < tgtTop - 4) {
          const exitPortY = Math.max(srcTop + 4, Math.min(srcBottom - 4, y1));
          const isStraight = bendMid?.x == null || Math.abs(bendMid.x - entryPortX) <= 30;
          if (isStraight) {
            waypoints = [
              { x: srcRight, y: exitPortY },
              { x: entryPortX, y: exitPortY },
              { x: entryPortX, y: tgtTop },
            ];
            segInfo.push({ key: srcKey, axis: "y" }, { key: tgtKey, axis: "x" });
          } else {
            const elbowX = Math.max(x1 + 4, Math.min(entryPortX, bendMid.x));
            waypoints = [
              { x: srcRight, y: exitPortY },
              { x: elbowX, y: exitPortY },
              { x: elbowX, y: userY },
              { x: entryPortX, y: userY },
              { x: entryPortX, y: tgtTop },
            ];
            segInfo.push(
              { key: srcKey, axis: "y" },
              { key: midKey, axis: "x" },
              { key: srcKey, axis: "y" },
              { key: tgtKey, axis: "x" },
            );
          }
        }
        // 4. Target bottom from right of source
        else if (userY != null && userY > tgtBottom + 4) {
          const exitPortY = Math.max(srcTop + 4, Math.min(srcBottom - 4, y1));
          const dropX =
            bendMid?.x != null ? Math.max(x1 + 4, Math.min(entryPortX, bendMid.x)) : (x1 + x2) / 2;
          waypoints = [
            { x: srcRight, y: exitPortY },
            { x: dropX, y: exitPortY },
            { x: dropX, y: userY },
            { x: entryPortX, y: userY },
            { x: entryPortX, y: tgtBottom },
          ];
          segInfo.push(
            { key: srcKey, axis: "y" },
            { key: midKey, axis: "x" },
            { key: srcKey, axis: "y" },
            { key: tgtKey, axis: "x" },
          );
        }
        // 5. Standard Left-to-Right
        else {
          const exitPortY = Math.max(srcTop + 4, Math.min(srcBottom - 4, bendS0?.y ?? y1));
          const entryPortY = Math.max(tgtTop + 4, Math.min(tgtBottom - 4, userY ?? y2));
          const defaultMidX = (x1 + x2) / 2;
          const elbowX =
            bendMid?.x != null ? Math.max(x1 + 4, Math.min(x2 - 4, bendMid.x)) : defaultMidX;

          if (Math.abs(exitPortY - entryPortY) <= 6) {
            waypoints = [
              { x: srcRight, y: exitPortY },
              { x: tgtLeft, y: exitPortY },
            ];
            segInfo.push({ key: srcKey, axis: "y" });
          } else {
            waypoints = [
              { x: srcRight, y: exitPortY },
              { x: elbowX, y: exitPortY },
              { x: elbowX, y: entryPortY },
              { x: tgtLeft, y: entryPortY },
            ];
            segInfo.push(
              { key: srcKey, axis: "y" },
              { key: midKey, axis: "x" },
              { key: srcKey, axis: "y" },
            );
          }
        }
      } else if (
        (startPort.dir === "bottom" && endPort.dir === "top") ||
        (startPort.dir === "top" && endPort.dir === "bottom")
      ) {
        const defaultMidY = (y1 + y2) / 2;
        let elbowY = bendMid?.y != null ? bendMid.y : defaultMidY;
        if (Math.abs(y2 - y1) > 8) {
          const minY = Math.min(y1, y2);
          const maxY = Math.max(y1, y2);
          elbowY = Math.max(minY + 4, Math.min(maxY - 4, elbowY));
        }

        const currentSrcX = bendS0?.x != null ? bendS0.x : x1;
        const currentTgtX = bendS2?.x != null ? bendS2.x : x2;

        const exitPortX = Math.max(srcLeft + 4, Math.min(srcRight - 4, currentSrcX));
        const entryPortX = Math.max(tgtLeft + 4, Math.min(tgtRight - 4, currentTgtX));

        if (Math.abs(exitPortX - entryPortX) <= 2 && !bendMid && !bendS0 && !bendS2) {
          waypoints = [
            { x: exitPortX, y: y1 },
            { x: entryPortX, y: y2 },
          ];
          segInfo.push({ key: srcKey, axis: "x" });
        } else {
          waypoints = [
            { x: exitPortX, y: y1 },
            { x: exitPortX, y: elbowY },
            { x: entryPortX, y: elbowY },
            { x: entryPortX, y: y2 },
          ];
          segInfo.push({ key: srcKey, axis: "x" });
          segInfo.push({ key: midKey, axis: "y" });
          segInfo.push({ key: tgtKey, axis: "x" });
        }
      } else {
        const defaultMidX = (x1 + x2) / 2;
        const elbowX = bendMid ? bendMid.x : defaultMidX;
        waypoints = [
          { x: x1, y: y1 },
          { x: elbowX, y: y1 },
          { x: elbowX, y: y2 },
          { x: x2, y: y2 },
        ];
        segInfo.push({ key: srcKey, axis: "y" });
        segInfo.push({ key: midKey, axis: "x" });
        segInfo.push({ key: tgtKey, axis: "y" });
      }

      const d = buildRoundedOrthogonalPath(waypoints, 8);

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

      // Render interactive hit lines & drag handles for bent & straight sequential arrows
      for (let sIdx = 0; sIdx < waypoints.length - 1; sIdx++) {
        const pA = waypoints[sIdx]!;
        const pB = waypoints[sIdx + 1]!;
        const isVertical = Math.abs(pA.x - pB.x) < 0.5 && Math.abs(pA.y - pB.y) > 6;
        const isHorizontal = Math.abs(pA.y - pB.y) < 0.5 && Math.abs(pA.x - pB.x) > 6;

        const info = segInfo[sIdx] || { key: edgeKey, axis: isHorizontal ? "y" : "x" };

        if (isVertical) {
          const segMinY = Math.min(pA.y, pB.y);
          const segMaxY = Math.max(pA.y, pB.y);
          const segMidY = (segMinY + segMaxY) / 2;
          out.push(
            <line
              key={`seq-vert-${edgeKey}-${sIdx}`}
              x1={pA.x}
              y1={segMinY}
              x2={pA.x}
              y2={segMaxY}
              stroke="transparent"
              strokeWidth={18}
              style={{ cursor: "ew-resize" }}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) =>
                ctx.onEdgePointerDown(e, info.key, { x: pA.x, y: segMidY }, "x")
              }
            />,
          );
        } else if (isHorizontal) {
          const segMinX = Math.min(pA.x, pB.x);
          const segMaxX = Math.max(pA.x, pB.x);
          const segMidX = (segMinX + segMaxX) / 2;
          out.push(
            <line
              key={`seq-horiz-${edgeKey}-${sIdx}`}
              x1={segMinX}
              y1={pA.y}
              x2={segMaxX}
              y2={pA.y}
              stroke="transparent"
              strokeWidth={18}
              style={{ cursor: "ns-resize" }}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) =>
                ctx.onEdgePointerDown(e, info.key, { x: segMidX, y: pA.y }, "y")
              }
            />,
          );
        }
      }

      // Plus insert button placed on first segment without blocking drag handles
      const insX = waypoints.length > 2 ? (waypoints[0]!.x + waypoints[1]!.x) / 2 : (x1 + x2) / 2;
      const insY = waypoints.length > 2 ? (waypoints[0]!.y + waypoints[1]!.y) / 2 : (y1 + y2) / 2;
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
