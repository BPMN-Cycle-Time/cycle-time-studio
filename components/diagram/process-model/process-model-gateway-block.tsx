"use client";

import type { ReactNode } from "react";
import { BlockType, BlockMode } from "@/types";
import {
  branchDisplayName,
  computeBranchValue,
  formatTimeValue,
  TASK_W,
  TASK_H,
  GW,
  GW_GAP,
  BRANCH_VGAP,
  type FlowMeasurement,
  type BlockMeasurement,
} from "@/services/graph";
import { SelectionKind } from "@/store/useEditorStore";
import { renderTaskBox, renderGatewayDiamond } from "./process-model-nodes";
import {
  getBranchFirstKey,
  getBranchLastKey,
  buildManhattanPath,
  type ProcessModelRendererContext,
} from "./process-model-helpers";

export function renderGatewayBlock(
  item: Extract<BlockMeasurement, { kind: "gateway" }>,
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
  const isXor = b.type === BlockType.XOR;
  const strokeColor = isXor ? "var(--c-xor, #a06820)" : "var(--c-and, #2a7e58)";
  const symbol = isXor ? "X" : "+";
  const isSelected = ctx.selectedId === b.id;

  const splitKey = `split-gw-${b.id}`;
  const joinKey = `join-gw-${b.id}`;
  const splitOff = ctx.customOffsets[splitKey] || { dx: 0, dy: 0 };
  const joinOff = ctx.customOffsets[joinKey] || { dx: 0, dy: 0 };

  const splitCx = x + GW / 2 + splitOff.dx;
  const splitCy = centerY + splitOff.dy;
  const joinCx = x + item.w - GW / 2 + joinOff.dx;
  const joinCy = centerY + joinOff.dy;

  const contentX = x + GW + GW_GAP;
  const railX = contentX + item.maxW;
  const top = centerY - item.h / 2;
  let y = top;

  item.branches.forEach((bx, bi) => {
    const isSingle = "single" in bx.content && bx.content.single;
    const firstKey = getBranchFirstKey(bx);
    const lastKey = getBranchLastKey(bx);
    const firstOff = ctx.customOffsets[firstKey] || { dx: 0, dy: 0 };
    const lastOff = ctx.customOffsets[lastKey] || { dx: 0, dy: 0 };

    const bCenter = y + bx.center;
    const brEntryX = contentX + firstOff.dx;
    const brEntryY = bCenter + firstOff.dy;
    const brExitX = contentX + bx.content.w + lastOff.dx;
    const brExitY = bCenter + lastOff.dy;

    const labelX = brEntryX;
    const labelY = brEntryY - TASK_H / 2 - 6;

    // Split -> Branch line with draggable vertical channel
    const splitEdgeKey = `split-branch-${b.id}-${bi}`;
    const splitBend = ctx.customEdgeBends?.[splitEdgeKey];
    const defaultSplitElbowX = brEntryX - 14;
    const splitElbowX = splitBend ? splitBend.x : defaultSplitElbowX;

    const splitPathD = buildManhattanPath(
      splitCx + GW / 2,
      splitCy,
      splitElbowX,
      brEntryX,
      brEntryY,
      8,
    );

    out.push(
      <path
        key={`conn-split-${b.id}-${bi}`}
        d={splitPathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.5}
      />,
    );

    // If split line has vertical step, render drag handle on the vertical channel
    if (Math.abs(splitCy - brEntryY) > 4) {
      const isDraggingSplit = ctx.draggingTargetId === splitEdgeKey;
      const splitMidY = (splitCy + brEntryY) / 2;
      out.push(
        <g key={`split-hdl-group-${b.id}-${bi}`}>
          <line
            x1={splitElbowX}
            y1={Math.min(splitCy, brEntryY)}
            x2={splitElbowX}
            y2={Math.max(splitCy, brEntryY)}
            stroke="transparent"
            strokeWidth={18}
            style={{ cursor: "ew-resize" }}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) =>
              ctx.onEdgePointerDown(e, splitEdgeKey, { x: splitElbowX, y: splitMidY })
            }
          />
          <circle
            cx={splitElbowX}
            cy={splitMidY}
            r={5.5}
            className={`edge-handle ${isDraggingSplit ? "dragging" : ""}`}
            style={{ cursor: "ew-resize" }}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) =>
              ctx.onEdgePointerDown(e, splitEdgeKey, { x: splitElbowX, y: splitMidY })
            }
          >
            <title>Drag to shift vertical line left/right</title>
          </circle>
        </g>,
      );
    }

    // Branch condition label with modern badge pill styling
    const caption = isXor
      ? bx.branch.mode === BlockMode.COMPOSITE
        ? `${branchDisplayName(bx.branch, ctx.tasks)} · ${formatTimeValue(bx.branch.p ?? 0)}%`
        : `${formatTimeValue(bx.branch.p ?? 0)}%`
      : bx.branch.mode === BlockMode.COMPOSITE
        ? branchDisplayName(bx.branch, ctx.tasks)
        : "";

    if (caption) {
      const badgeW = caption.length * 6.6 + 14;
      const badgeH = 17;
      out.push(
        <g key={`caption-${bx.branch.id}`} className="branch-label-badge">
          <rect
            x={labelX}
            y={labelY - 13}
            width={badgeW}
            height={badgeH}
            rx={4}
            fill="var(--card, #ffffff)"
            stroke={strokeColor}
            strokeWidth={1}
            opacity={0.96}
          />
          <text
            x={labelX + badgeW / 2}
            y={labelY - 1}
            textAnchor="middle"
            fontSize={10.5}
            fontWeight={600}
            fill={strokeColor}
            fontFamily={isXor ? "ui-monospace, monospace" : "inherit"}
          >
            {caption}
          </text>
        </g>,
      );
    }

    const isBrSelected = ctx.selectedId === bx.branch.id;
    const brGid = ctx.graphIdOf(`branch:${bx.branch.id}`);

    if (isSingle) {
      const timeVal = formatTimeValue(computeBranchValue(bx.branch, ctx.tasks)) + ctx.unitShort;
      out.push(
        renderTaskBox(
          firstKey,
          brEntryX,
          brEntryY - TASK_H / 2,
          TASK_W,
          TASK_H,
          branchDisplayName(bx.branch, ctx.tasks),
          strokeColor,
          isXor ? "var(--c-xor-soft, #f2e6d4)" : "var(--c-and-soft, #dcece2)",
          timeVal,
          brGid,
          ctx.showIds,
          isBrSelected,
          ctx.draggingTargetId === firstKey,
          (e) => ctx.onNodePointerDown(e, firstKey, SelectionKind.BRANCH, bx.branch.id),
          (e) => ctx.onNodePointerUp(e, SelectionKind.BRANCH, bx.branch.id),
        ),
      );
    } else {
      renderFlowRecursiveFn(bx.content as FlowMeasurement, contentX, bCenter, out, ctx);
    }

    // Branch -> Join line with draggable vertical channel
    const joinEdgeKey = `branch-join-${b.id}-${bi}`;
    const joinBend = ctx.customEdgeBends?.[joinEdgeKey];
    const defaultTargetRailX = Math.max(brExitX + 14, railX);
    const targetRailX = joinBend ? joinBend.x : defaultTargetRailX;

    const joinPathD = buildManhattanPath(brExitX, brExitY, targetRailX, joinCx - GW / 2, joinCy, 8);

    out.push(
      <path
        key={`conn-join-${b.id}-${bi}`}
        d={joinPathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.5}
      />,
    );

    // If join line has vertical step, render drag handle on the vertical channel
    if (Math.abs(brExitY - joinCy) > 4) {
      const isDraggingJoin = ctx.draggingTargetId === joinEdgeKey;
      const joinMidY = (brExitY + joinCy) / 2;
      out.push(
        <g key={`join-hdl-group-${b.id}-${bi}`}>
          <line
            x1={targetRailX}
            y1={Math.min(brExitY, joinCy)}
            x2={targetRailX}
            y2={Math.max(brExitY, joinCy)}
            stroke="transparent"
            strokeWidth={18}
            style={{ cursor: "ew-resize" }}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) =>
              ctx.onEdgePointerDown(e, joinEdgeKey, { x: targetRailX, y: joinMidY })
            }
          />
          <circle
            cx={targetRailX}
            cy={joinMidY}
            r={5.5}
            className={`edge-handle ${isDraggingJoin ? "dragging" : ""}`}
            style={{ cursor: "ew-resize" }}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) =>
              ctx.onEdgePointerDown(e, joinEdgeKey, { x: targetRailX, y: joinMidY })
            }
          >
            <title>Drag to shift vertical line left/right</title>
          </circle>
        </g>,
      );
    }

    y += bx.h + BRANCH_VGAP;
  });

  const splitGid = ctx.graphIdOf(`split:${b.id}`);
  const joinGid = ctx.graphIdOf(`join:${b.id}`);

  // Split Diamond
  out.push(
    renderGatewayDiamond(
      splitKey,
      splitCx,
      splitCy,
      symbol,
      strokeColor,
      splitGid,
      ctx.showIds,
      isSelected,
      ctx.draggingTargetId === splitKey,
      (e) => ctx.onNodePointerDown(e, splitKey, SelectionKind.BLOCK, b.id),
      (e) => ctx.onNodePointerUp(e, SelectionKind.BLOCK, b.id),
    ),
  );

  // Join Diamond
  out.push(
    renderGatewayDiamond(
      joinKey,
      joinCx,
      joinCy,
      symbol,
      strokeColor,
      joinGid,
      ctx.showIds,
      isSelected,
      ctx.draggingTargetId === joinKey,
      (e) => ctx.onNodePointerDown(e, joinKey, SelectionKind.BLOCK, b.id),
      (e) => ctx.onNodePointerUp(e, SelectionKind.BLOCK, b.id),
    ),
  );
}
