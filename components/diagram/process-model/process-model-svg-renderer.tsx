import type { ReactNode } from "react";
import { BlockType, BlockMode, type Task } from "@/types";
import { SelectionKind } from "@/store/useEditorStore";
import {
  blockDisplayName,
  branchDisplayName,
  leafTime,
  computeBranchValue,
  formatTimeValue,
  TASK_W,
  TASK_H,
  GAP,
  GW,
  GW_GAP,
  BRANCH_VGAP,
  LABEL_H,
  LOOP_H,
  type FlowMeasurement,
  type BlockMeasurement,
} from "@/services/graph";
import { renderTaskBox, renderGatewayDiamond } from "./process-model-nodes";

export function renderFlowRecursive(
  layout: FlowMeasurement,
  startX: number,
  centerY: number,
  out: ReactNode[],
  showIds: boolean,
  selectedId: string | null,
  tasks: Task[] | undefined,
  unitShort: string,
  graphIdOf: (key: string) => string,
  onNodeClick: (kind: SelectionKind, id: string) => void,
  onInsertClick: (targetId: string, pos: "before" | "after") => void,
) {
  if (layout.empty) return;

  let cx = startX;
  layout.items.forEach((item, i) => {
    if (i > 0) {
      out.push(
        <line
          key={`arrow-${item.block.id}-${i}`}
          x1={cx}
          y1={centerY}
          x2={cx + GAP}
          y2={centerY}
          stroke="var(--foreground, #23261f)"
          strokeWidth={1.5}
          markerEnd="url(#pm-arrow)"
        />,
      );
      out.push(
        <g
          key={`ins-${item.block.id}-${i}`}
          className="ins"
          onClick={() => onInsertClick(item.block.id, "before")}
        >
          <circle
            cx={cx + GAP / 2}
            cy={centerY}
            r={8}
            fill="var(--secondary, #ebe8e0)"
            stroke="var(--border, #ddd7c8)"
            strokeWidth={1}
          />
          <text
            x={cx + GAP / 2}
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
      cx += GAP;
    }

    renderBlockItem(
      item,
      cx,
      centerY,
      out,
      showIds,
      selectedId,
      tasks,
      unitShort,
      graphIdOf,
      onNodeClick,
      onInsertClick,
    );
    cx += item.w;
  });
}

export function renderBlockItem(
  item: BlockMeasurement,
  x: number,
  centerY: number,
  out: ReactNode[],
  showIds: boolean,
  selectedId: string | null,
  tasks: Task[] | undefined,
  unitShort: string,
  graphIdOf: (key: string) => string,
  onNodeClick: (kind: SelectionKind, id: string) => void,
  onInsertClick: (targetId: string, pos: "before" | "after") => void,
) {
  const b = item.block;
  const isSelected = selectedId === b.id;

  if (item.kind === "task") {
    const gid = graphIdOf(`block:${b.id}`);
    const timeVal = formatTimeValue(leafTime(b, "time", tasks)) + unitShort;
    out.push(
      renderTaskBox(
        `task-${b.id}`,
        x,
        centerY - TASK_H / 2,
        TASK_W,
        TASK_H,
        blockDisplayName(b, tasks),
        "var(--c-seq, #3d5a80)",
        "var(--c-seq-soft, #e2e8f1)",
        timeVal,
        gid,
        showIds,
        isSelected,
        () => onNodeClick(SelectionKind.BLOCK, b.id),
      ),
    );
    return;
  }

  if (item.kind === "rework") {
    const strokeColor = "var(--c-rework, #8b5a72)";
    const fillColor = "var(--c-rework-soft, #ecdfe6)";
    const gid = graphIdOf(`block:${b.id}`);
    const loopGid = graphIdOf(`loop:${b.id}`);
    let bodyTop: number;

    if ("single" in item.body && item.body.single) {
      const timeVal = formatTimeValue(leafTime(b, "loopTime", tasks)) + unitShort;
      out.push(
        renderTaskBox(
          `rw-task-${b.id}`,
          x,
          centerY - TASK_H / 2,
          TASK_W,
          TASK_H,
          blockDisplayName(b, tasks),
          strokeColor,
          fillColor,
          timeVal,
          gid,
          showIds,
          isSelected,
          () => onNodeClick(SelectionKind.BLOCK, b.id),
        ),
      );
      bodyTop = centerY - TASK_H / 2;
    } else {
      renderFlowRecursive(
        item.body as FlowMeasurement,
        x,
        centerY,
        out,
        showIds,
        selectedId,
        tasks,
        unitShort,
        graphIdOf,
        onNodeClick,
        onInsertClick,
      );
      bodyTop = centerY - (item.body as FlowMeasurement).center;
    }

    const r = b.loopP ?? 0;
    const isBad = r >= 100;
    const arcColor = isBad ? "var(--destructive, #ad4326)" : strokeColor;
    const midY = bodyTop - (LOOP_H - 14);
    const left = x + 14;
    const right = x + item.w - 14;
    const arcD = `M ${right} ${bodyTop} C ${right} ${midY} ${left} ${midY} ${left} ${bodyTop}`;

    out.push(
      <g
        key={`rw-loop-${b.id}`}
        className={`hit ${isSelected ? "sel" : ""}`}
        onClick={() => onNodeClick(SelectionKind.BLOCK, b.id)}
      >
        <path d={arcD} fill="none" stroke="transparent" strokeWidth={14} />
        <path
          d={arcD}
          fill="none"
          stroke={arcColor}
          strokeWidth={isSelected ? 3 : 1.5}
          markerEnd="url(#pm-arrow-rw)"
        />
        <text
          x={(left + right) / 2}
          y={midY - 4}
          textAnchor="middle"
          fontSize={11}
          fill={arcColor}
          fontFamily="ui-monospace, monospace"
          fontWeight={500}
        >
          {`r = ${formatTimeValue(r)}%`}
        </text>
        {showIds && loopGid && (
          <text
            x={right + 4}
            y={bodyTop - 4}
            textAnchor="start"
            fontSize={9.5}
            fill="var(--muted-foreground, #6f7266)"
            fontFamily="ui-monospace, monospace"
          >
            {loopGid}
          </text>
        )}
      </g>,
    );
    return;
  }

  // Gateway (XOR / AND)
  const isXor = b.type === BlockType.XOR;
  const strokeColor = isXor ? "var(--c-xor, #a8763e)" : "var(--c-and, #3f7d5c)";
  const symbol = isXor ? "X" : "+";
  const splitCx = x + GW / 2;
  const joinCx = x + item.w - GW / 2;
  const contentX = x + GW + GW_GAP;
  const railX = contentX + item.maxW;
  const top = centerY - item.h / 2;
  let y = top;

  item.branches.forEach((bx, bi) => {
    const bCenter = y + bx.center;
    const contentTop = y + LABEL_H;
    const isBrSelected = selectedId === bx.branch.id;
    const brGid = graphIdOf(`branch:${bx.branch.id}`);

    // Connecting line from split
    out.push(
      <polyline
        key={`conn-split-${b.id}-${bi}`}
        points={`${splitCx + GW / 2},${centerY} ${contentX - 10},${bCenter} ${contentX},${bCenter}`}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.4}
      />,
    );

    // Branch condition label
    const caption = isXor
      ? bx.branch.mode === BlockMode.COMPOSITE
        ? `${branchDisplayName(bx.branch, tasks)} · ${formatTimeValue(bx.branch.p ?? 0)}%`
        : `${formatTimeValue(bx.branch.p ?? 0)}%`
      : bx.branch.mode === BlockMode.COMPOSITE
        ? branchDisplayName(bx.branch, tasks)
        : "";

    if (caption) {
      out.push(
        <text
          key={`caption-${bx.branch.id}`}
          x={contentX}
          y={contentTop - 5}
          textAnchor="start"
          fontSize={11}
          fill={strokeColor}
          fontFamily={isXor ? "ui-monospace, monospace" : "inherit"}
        >
          {caption}
        </text>,
      );
    }

    if ("single" in bx.content && bx.content.single) {
      const timeVal = formatTimeValue(computeBranchValue(bx.branch, tasks)) + unitShort;
      out.push(
        renderTaskBox(
          `br-task-${bx.branch.id}`,
          contentX,
          bCenter - TASK_H / 2,
          TASK_W,
          TASK_H,
          branchDisplayName(bx.branch, tasks),
          strokeColor,
          isXor ? "var(--c-xor-soft, #f2e6d4)" : "var(--c-and-soft, #dcece2)",
          timeVal,
          brGid,
          showIds,
          isBrSelected,
          () => onNodeClick(SelectionKind.BRANCH, bx.branch.id),
        ),
      );
    } else {
      renderFlowRecursive(
        bx.content as FlowMeasurement,
        contentX,
        bCenter,
        out,
        showIds,
        selectedId,
        tasks,
        unitShort,
        graphIdOf,
        onNodeClick,
        onInsertClick,
      );
    }

    // Connecting line to join
    const endX = contentX + bx.content.w;
    const pts =
      endX === railX
        ? `${railX},${bCenter} ${joinCx - GW / 2},${centerY}`
        : `${endX},${bCenter} ${railX},${bCenter} ${joinCx - GW / 2},${centerY}`;

    out.push(
      <polyline
        key={`conn-join-${b.id}-${bi}`}
        points={pts}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.4}
      />,
    );

    y += bx.h + BRANCH_VGAP;
  });

  const splitGid = graphIdOf(`split:${b.id}`);
  const joinGid = graphIdOf(`join:${b.id}`);

  // Split Diamond
  out.push(
    renderGatewayDiamond(
      `split-gw-${b.id}`,
      splitCx,
      centerY,
      symbol,
      strokeColor,
      splitGid,
      showIds,
      isSelected,
      () => onNodeClick(SelectionKind.BLOCK, b.id),
    ),
  );

  // Join Diamond
  out.push(
    renderGatewayDiamond(
      `join-gw-${b.id}`,
      joinCx,
      centerY,
      symbol,
      strokeColor,
      joinGid,
      showIds,
      isSelected,
      () => onNodeClick(SelectionKind.BLOCK, b.id),
    ),
  );
}
