"use client";

import type { ReactNode } from "react";
import { BlockType } from "@/types";
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
import { renderTaskBox, renderGatewayDiamond, renderBranchBadge } from "./process-model-nodes";
import {
  getBranchFirstKey,
  getBranchLastKey,
  buildRoundedOrthogonalPath,
  computeBranchCaption,
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

    // Split -> Branch line with draggable channel & BPMN-style cardinal ports
    const splitEdgeKey = `split-branch-${b.id}-${bi}`;
    const splitBend = ctx.customEdgeBends?.[splitEdgeKey];

    let startPortX = splitCx + GW / 2;
    let startPortY = splitCy;
    const isBehindGateway = brEntryX < splitCx + 10;

    if (isBehindGateway) {
      if (brEntryY < splitCy - 10) {
        startPortX = splitCx;
        startPortY = splitCy - GW / 2;
      } else if (brEntryY > splitCy + 10) {
        startPortX = splitCx;
        startPortY = splitCy + GW / 2;
      }
    }

    const defaultSplitElbowX = isBehindGateway
      ? Math.min(startPortX, brEntryX) - 20
      : (startPortX + brEntryX) / 2;
    let splitElbowX = splitBend ? splitBend.x : defaultSplitElbowX;
    const minSplitX = Math.min(startPortX, brEntryX) - 100;
    const maxSplitX = Math.max(startPortX, brEntryX) + 100;
    splitElbowX = Math.max(minSplitX, Math.min(maxSplitX, splitElbowX));
    if (!isBehindGateway && brEntryX > startPortX + 8) {
      splitElbowX = Math.max(startPortX + 4, Math.min(brEntryX - 4, splitElbowX));
    }

    const entryTaskTop = brEntryY - TASK_H / 2;
    const entryTaskBottom = brEntryY + TASK_H / 2;
    const entryTaskLeft = brEntryX;
    const entryTaskRight = brEntryX + TASK_W;
    const entryTaskCenterX = brEntryX + TASK_W / 2;

    const currentEntryY = splitBend?.y != null ? splitBend.y : brEntryY;
    let splitPoints: Array<{ x: number; y: number }> = [];
    let draggableSplitRailX = splitElbowX;

    if (currentEntryY < entryTaskTop - 2) {
      let entryPortX = splitBend ? splitBend.x : entryTaskCenterX;
      entryPortX = Math.max(entryTaskLeft + 10, Math.min(entryTaskRight - 10, entryPortX));
      draggableSplitRailX = entryPortX;

      if (Math.abs(currentEntryY - splitCy) <= 6) {
        splitPoints = [
          { x: splitCx + GW / 2, y: splitCy },
          { x: entryPortX, y: splitCy },
          { x: entryPortX, y: entryTaskTop },
        ];
      } else {
        const gwVertexY = currentEntryY > splitCy ? splitCy + GW / 2 : splitCy - GW / 2;
        splitPoints = [
          { x: splitCx, y: gwVertexY },
          { x: splitCx, y: currentEntryY },
          { x: entryPortX, y: currentEntryY },
          { x: entryPortX, y: entryTaskTop },
        ];
      }
    } else if (currentEntryY > entryTaskBottom + 2) {
      let entryPortX = splitBend ? splitBend.x : entryTaskCenterX;
      entryPortX = Math.max(entryTaskLeft + 10, Math.min(entryTaskRight - 10, entryPortX));
      draggableSplitRailX = entryPortX;

      if (Math.abs(currentEntryY - splitCy) <= 6) {
        splitPoints = [
          { x: splitCx + GW / 2, y: splitCy },
          { x: entryPortX, y: splitCy },
          { x: entryPortX, y: entryTaskBottom },
        ];
      } else {
        const gwVertexY = currentEntryY > splitCy ? splitCy + GW / 2 : splitCy - GW / 2;
        splitPoints = [
          { x: splitCx, y: gwVertexY },
          { x: splitCx, y: currentEntryY },
          { x: entryPortX, y: currentEntryY },
          { x: entryPortX, y: entryTaskBottom },
        ];
      }
    } else {
      const entryPortY = Math.max(entryTaskTop + 4, Math.min(entryTaskBottom - 4, currentEntryY));
      splitPoints = [{ x: startPortX, y: startPortY }];
      if (startPortX === splitCx) {
        splitPoints.push({ x: splitElbowX, y: startPortY });
        splitPoints.push({ x: splitElbowX, y: entryPortY });
        splitPoints.push({ x: brEntryX, y: entryPortY });
      } else {
        if (Math.abs(startPortY - entryPortY) > 4 || splitBend) {
          splitPoints.push({ x: splitElbowX, y: startPortY });
          splitPoints.push({ x: splitElbowX, y: entryPortY });
        }
        splitPoints.push({ x: brEntryX, y: entryPortY });
      }
    }

    const splitPathD = buildRoundedOrthogonalPath(splitPoints, 8);

    out.push(
      <path
        key={`conn-split-${b.id}-${bi}`}
        d={splitPathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.5}
      />,
    );

    for (let sIdx = 0; sIdx < splitPoints.length - 1; sIdx++) {
      const pA = splitPoints[sIdx]!;
      const pB = splitPoints[sIdx + 1]!;
      const isVertical = Math.abs(pA.x - pB.x) < 0.5 && Math.abs(pA.y - pB.y) > 6;
      const isHorizontal = Math.abs(pA.y - pB.y) < 0.5 && Math.abs(pA.x - pB.x) > 6;

      if (isVertical) {
        const isInteractiveRail = Math.abs(pA.x - draggableSplitRailX) < 2;
        if (isInteractiveRail) {
          const segMinY = Math.min(pA.y, pB.y);
          const segMaxY = Math.max(pA.y, pB.y);
          const segMidY = (segMinY + segMaxY) / 2;
          out.push(
            <line
              key={`split-vert-${b.id}-${bi}-${sIdx}`}
              x1={pA.x}
              y1={segMinY}
              x2={pA.x}
              y2={segMaxY}
              stroke="transparent"
              strokeWidth={18}
              style={{ cursor: "ew-resize" }}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) =>
                ctx.onEdgePointerDown(e, splitEdgeKey, { x: pA.x, y: segMidY }, "x")
              }
            />,
          );
        }
      } else if (isHorizontal) {
        const segMinX = Math.min(pA.x, pB.x);
        const segMaxX = Math.max(pA.x, pB.x);
        const segMidX = (segMinX + segMaxX) / 2;
        out.push(
          <line
            key={`split-horiz-${b.id}-${bi}-${sIdx}`}
            x1={segMinX}
            y1={pA.y}
            x2={segMaxX}
            y2={pA.y}
            stroke="transparent"
            strokeWidth={18}
            style={{ cursor: "ns-resize" }}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) =>
              ctx.onEdgePointerDown(e, splitEdgeKey, { x: segMidX, y: pA.y }, "y")
            }
          />,
        );
      }
    }

    const caption = computeBranchCaption(bx, bi, item.branches, isXor, ctx.tasks);
    if (caption) {
      out.push(renderBranchBadge(bx.branch.id, labelX, labelY, caption, strokeColor, isXor));
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

    // Branch -> Join line with draggable channel & BPMN-style cardinal ports
    const joinEdgeKey = `branch-join-${b.id}-${bi}`;
    const joinBend = ctx.customEdgeBends?.[joinEdgeKey];

    let endPortX = joinCx - GW / 2;
    let endPortY = joinCy;
    const isAheadOfJoin = brExitX > joinCx - 10;

    if (isAheadOfJoin) {
      if (brExitY < joinCy - 10) {
        endPortX = joinCx;
        endPortY = joinCy - GW / 2;
      } else if (brExitY > joinCy + 10) {
        endPortX = joinCx;
        endPortY = joinCy + GW / 2;
      }
    }

    const defaultTargetRailX = isAheadOfJoin ? Math.max(endPortX, brExitX) + 20 : endPortX - 14;
    let targetRailX = joinBend ? joinBend.x : defaultTargetRailX;
    const minJoinX = Math.min(brExitX, endPortX) - 100;
    const maxJoinX = Math.max(brExitX, endPortX) + 100;
    targetRailX = Math.max(minJoinX, Math.min(maxJoinX, targetRailX));
    if (!isAheadOfJoin && endPortX > brExitX + 8) {
      targetRailX = Math.max(brExitX + 4, Math.min(endPortX - 4, targetRailX));
    }

    const exitTaskTop = brExitY - TASK_H / 2;
    const exitTaskBottom = brExitY + TASK_H / 2;
    const exitTaskLeft = brExitX - TASK_W;
    const exitTaskRight = brExitX;
    const exitTaskCenterX = brExitX - TASK_W / 2;

    const currentExitY = joinBend?.y != null ? joinBend.y : brExitY;
    let joinPoints: Array<{ x: number; y: number }> = [];
    let draggableJoinRailX = targetRailX;

    if (currentExitY < exitTaskTop - 2) {
      let exitPortX = joinBend ? joinBend.x : exitTaskCenterX;
      exitPortX = Math.max(exitTaskLeft + 10, Math.min(exitTaskRight - 10, exitPortX));
      draggableJoinRailX = exitPortX;

      if (Math.abs(currentExitY - joinCy) <= 6) {
        joinPoints = [
          { x: exitPortX, y: exitTaskTop },
          { x: exitPortX, y: joinCy },
          { x: joinCx - GW / 2, y: joinCy },
        ];
      } else {
        const gwVertexY = currentExitY > joinCy ? joinCy + GW / 2 : joinCy - GW / 2;
        joinPoints = [
          { x: exitPortX, y: exitTaskTop },
          { x: exitPortX, y: currentExitY },
          { x: joinCx, y: currentExitY },
          { x: joinCx, y: gwVertexY },
        ];
      }
    } else if (currentExitY > exitTaskBottom + 2) {
      let exitPortX = joinBend ? joinBend.x : exitTaskCenterX;
      exitPortX = Math.max(exitTaskLeft + 10, Math.min(exitTaskRight - 10, exitPortX));
      draggableJoinRailX = exitPortX;

      if (Math.abs(currentExitY - joinCy) <= 6) {
        joinPoints = [
          { x: exitPortX, y: exitTaskBottom },
          { x: exitPortX, y: joinCy },
          { x: joinCx - GW / 2, y: joinCy },
        ];
      } else {
        const gwVertexY = currentExitY > joinCy ? joinCy + GW / 2 : joinCy - GW / 2;
        joinPoints = [
          { x: exitPortX, y: exitTaskBottom },
          { x: exitPortX, y: currentExitY },
          { x: joinCx, y: currentExitY },
          { x: joinCx, y: gwVertexY },
        ];
      }
    } else {
      const exitPortY = Math.max(exitTaskTop + 4, Math.min(exitTaskBottom - 4, currentExitY));
      joinPoints = [{ x: brExitX, y: exitPortY }];
      if (endPortX === joinCx) {
        joinPoints.push({ x: targetRailX, y: exitPortY });
        joinPoints.push({ x: targetRailX, y: endPortY });
        joinPoints.push({ x: endPortX, y: endPortY });
      } else {
        if (Math.abs(exitPortY - endPortY) > 4 || joinBend) {
          joinPoints.push({ x: targetRailX, y: exitPortY });
          joinPoints.push({ x: targetRailX, y: endPortY });
        }
        joinPoints.push({ x: endPortX, y: endPortY });
      }
    }

    const joinPathD = buildRoundedOrthogonalPath(joinPoints, 8);

    out.push(
      <path
        key={`conn-join-${b.id}-${bi}`}
        d={joinPathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.5}
      />,
    );

    for (let sIdx = 0; sIdx < joinPoints.length - 1; sIdx++) {
      const pA = joinPoints[sIdx]!;
      const pB = joinPoints[sIdx + 1]!;
      const isVertical = Math.abs(pA.x - pB.x) < 0.5 && Math.abs(pA.y - pB.y) > 6;
      const isHorizontal = Math.abs(pA.y - pB.y) < 0.5 && Math.abs(pA.x - pB.x) > 6;

      if (isVertical) {
        const isInteractiveRail = Math.abs(pA.x - draggableJoinRailX) < 2;
        if (isInteractiveRail) {
          const segMinY = Math.min(pA.y, pB.y);
          const segMaxY = Math.max(pA.y, pB.y);
          const segMidY = (segMinY + segMaxY) / 2;
          out.push(
            <line
              key={`join-vert-${b.id}-${bi}-${sIdx}`}
              x1={pA.x}
              y1={segMinY}
              x2={pA.x}
              y2={segMaxY}
              stroke="transparent"
              strokeWidth={18}
              style={{ cursor: "ew-resize" }}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) =>
                ctx.onEdgePointerDown(e, joinEdgeKey, { x: pA.x, y: segMidY }, "x")
              }
            />,
          );
        }
      } else if (isHorizontal) {
        const segMinX = Math.min(pA.x, pB.x);
        const segMaxX = Math.max(pA.x, pB.x);
        const segMidX = (segMinX + segMaxX) / 2;
        out.push(
          <line
            key={`join-horiz-${b.id}-${bi}-${sIdx}`}
            x1={segMinX}
            y1={pA.y}
            x2={segMaxX}
            y2={pA.y}
            stroke="transparent"
            strokeWidth={18}
            style={{ cursor: "ns-resize" }}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) =>
              ctx.onEdgePointerDown(e, joinEdgeKey, { x: segMidX, y: pA.y }, "y")
            }
          />,
        );
      }
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
