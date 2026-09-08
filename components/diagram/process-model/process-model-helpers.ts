import {
  formatTimeValue,
  type BlockMeasurement,
  type FlowMeasurement,
  type EdgeRoutingStyle,
} from "@/services/graph";
import type { Task } from "@/types";
import type { SelectionKind } from "@/store/useEditorStore";

export interface ProcessModelRendererContext {
  customOffsets: Record<string, { dx: number; dy: number }>;
  customEdgeBends: Record<string, { x: number; y: number }>;
  routingStyle: EdgeRoutingStyle;
  draggingTargetId: string | null;
  selectedId: string | null;
  showIds: boolean;
  tasks: Task[] | undefined;
  unitShort: string;
  graphIdOf: (key: string) => string;
  onNodePointerDown: (
    e: React.PointerEvent,
    targetKey: string,
    kind: SelectionKind,
    id: string,
  ) => void;
  onNodePointerUp: (e: React.PointerEvent, kind: SelectionKind, id: string) => void;
  onEdgePointerDown: (
    e: React.PointerEvent,
    edgeKey: string,
    defaultPos: { x: number; y: number },
    axis?: "x" | "y" | "both",
  ) => void;
  onArcPointerDown: (e: React.PointerEvent, targetKey: string) => void;
  onArcPointerUp: (e: React.PointerEvent) => void;
  onInsertClick: (targetId: string, pos: "before" | "after") => void;
}

export function getItemKey(item: BlockMeasurement): string {
  if (item.kind === "task") return `task-${item.block.id}`;
  if (item.kind === "gateway") return `split-gw-${item.block.id}`;
  if ("single" in item.body && item.body.single) {
    return `rw-task-${item.block.id}`;
  }
  const flow = item.body as FlowMeasurement;
  if (!flow.empty && flow.items.length > 0) {
    return getItemKey(flow.items[0]!);
  }
  return `rw-task-${item.block.id}`;
}

export function getItemExitKey(item: BlockMeasurement): string {
  if (item.kind === "task") return `task-${item.block.id}`;
  if (item.kind === "gateway") return `join-gw-${item.block.id}`;
  if ("single" in item.body && item.body.single) {
    return `rw-task-${item.block.id}`;
  }
  const flow = item.body as FlowMeasurement;
  if (!flow.empty && flow.items.length > 0) {
    return getItemExitKey(flow.items[flow.items.length - 1]!);
  }
  return `rw-task-${item.block.id}`;
}

export function getBranchFirstKey(bx: {
  branch: { id: string };
  content: FlowMeasurement | { single: true };
}): string {
  if ("single" in bx.content && bx.content.single) {
    return `br-task-${bx.branch.id}`;
  }
  const flow = bx.content as FlowMeasurement;
  if (!flow.empty && flow.items.length > 0) {
    return getItemKey(flow.items[0]!);
  }
  return `br-task-${bx.branch.id}`;
}

export function getBranchLastKey(bx: {
  branch: { id: string };
  content: FlowMeasurement | { single: true };
}): string {
  if ("single" in bx.content && bx.content.single) {
    return `br-task-${bx.branch.id}`;
  }
  const flow = bx.content as FlowMeasurement;
  if (!flow.empty && flow.items.length > 0) {
    return getItemExitKey(flow.items[flow.items.length - 1]!);
  }
  return `br-task-${bx.branch.id}`;
}

export function buildRoundedOrthogonalPath(
  rawPoints: Array<{ x: number; y: number }>,
  r = 8,
): string {
  if (rawPoints.length < 2) return "";
  const points: Array<{ x: number; y: number }> = [];
  for (const pt of rawPoints) {
    if (
      points.length === 0 ||
      Math.abs(pt.x - points[points.length - 1]!.x) > 0.5 ||
      Math.abs(pt.y - points[points.length - 1]!.y) > 0.5
    ) {
      points.push(pt);
    }
  }
  if (points.length < 2) return "";
  if (points.length === 2) {
    return `M ${points[0]!.x} ${points[0]!.y} L ${points[1]!.x} ${points[1]!.y}`;
  }

  let d = `M ${points[0]!.x} ${points[0]!.y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1]!;
    const curr = points[i]!;
    const next = points[i + 1]!;

    const d1X = curr.x - prev.x;
    const d1Y = curr.y - prev.y;
    const len1 = Math.hypot(d1X, d1Y);

    const d2X = next.x - curr.x;
    const d2Y = next.y - curr.y;
    const len2 = Math.hypot(d2X, d2Y);

    if (len1 < 0.5 || len2 < 0.5) continue;

    const u1X = d1X / len1;
    const u1Y = d1Y / len1;
    const u2X = d2X / len2;
    const u2Y = d2Y / len2;

    const cornerRadius = Math.min(r, len1 / 2, len2 / 2);
    if (cornerRadius < 1) {
      d += ` L ${curr.x} ${curr.y}`;
    } else {
      const p1X = curr.x - u1X * cornerRadius;
      const p1Y = curr.y - u1Y * cornerRadius;
      const p2X = curr.x + u2X * cornerRadius;
      const p2Y = curr.y + u2Y * cornerRadius;
      d += ` L ${p1X} ${p1Y} Q ${curr.x} ${curr.y} ${p2X} ${p2Y}`;
    }
  }

  const last = points[points.length - 1]!;
  d += ` L ${last.x} ${last.y}`;
  return d;
}

export function buildManhattanPath(
  startX: number,
  startY: number,
  elbowX: number,
  endX: number,
  endY: number,
  r = 6,
): string {
  if (Math.abs(startY - endY) < 1) {
    return `M ${startX} ${startY} L ${endX} ${endY}`;
  }
  return buildRoundedOrthogonalPath(
    [
      { x: startX, y: startY },
      { x: elbowX, y: startY },
      { x: elbowX, y: endY },
      { x: endX, y: endY },
    ],
    r,
  );
}

export type CardinalDirection = "top" | "bottom" | "left" | "right";

export interface CardinalPort {
  x: number;
  y: number;
  dir: CardinalDirection;
}

export function getBoxPorts(box: {
  x: number;
  y: number;
  w: number;
  h: number;
}): Record<CardinalDirection, CardinalPort> {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  return {
    top: { x: cx, y: box.y, dir: "top" },
    bottom: { x: cx, y: box.y + box.h, dir: "bottom" },
    left: { x: box.x, y: cy, dir: "left" },
    right: { x: box.x + box.w, y: cy, dir: "right" },
  };
}

export function chooseSequentialPorts(
  source: { x: number; y: number; w: number; h: number },
  target: { x: number; y: number; w: number; h: number },
): { startPort: CardinalPort; endPort: CardinalPort } {
  const sPorts = getBoxPorts(source);
  const tPorts = getBoxPorts(target);

  const sCx = source.x + source.w / 2;
  const sCy = source.y + source.h / 2;
  const tCx = target.x + target.w / 2;
  const tCy = target.y + target.h / 2;

  const dx = tCx - sCx;
  const dy = tCy - sCy;

  // If target is directly underneath source in a vertical stack
  if (dy > source.h * 0.75 && Math.abs(dx) < Math.max(source.w, target.w) * 0.6) {
    return { startPort: sPorts.bottom, endPort: tPorts.top };
  }

  // If target is directly above source in a vertical stack
  if (dy < -source.h * 0.75 && Math.abs(dx) < Math.max(source.w, target.w) * 0.6) {
    return { startPort: sPorts.top, endPort: tPorts.bottom };
  }

  // If target is forward (to the right)
  if (target.x >= source.x + source.w * 0.4) {
    return { startPort: sPorts.right, endPort: tPorts.left };
  }

  // If target is behind (dragged backwards)
  if (dy > source.h * 0.4) {
    return { startPort: sPorts.bottom, endPort: tPorts.top };
  }
  if (dy < -source.h * 0.4) {
    return { startPort: sPorts.top, endPort: tPorts.bottom };
  }
  return { startPort: sPorts.left, endPort: tPorts.right };
}

export function computeBranchCaption(
  bx: { branch: { id: string; label?: string; p?: number; taskId?: string | null } },
  bi: number,
  allBranches: Array<{ branch: { label?: string } }>,
  isXor: boolean,
  tasks?: Array<{ id: string; name?: string }>,
): string {
  if (!isXor) return "";
  const customBranchLabel = bx.branch.label?.trim();
  const task = tasks?.find((t) => t.id === bx.branch.taskId);
  const taskName = task?.name?.trim() || "";
  const isGenericBranchLabel =
    !customBranchLabel ||
    /^branch(\s+[a-z0-9]+)?$/i.test(customBranchLabel) ||
    (taskName && customBranchLabel.toLowerCase() === taskName.toLowerCase());

  let effectiveConditionLabel = !isGenericBranchLabel ? customBranchLabel : "";
  if (allBranches.length === 2 && !effectiveConditionLabel) {
    const otherIdx = bi === 0 ? 1 : 0;
    const otherLabel = allBranches[otherIdx]?.branch.label?.trim().toLowerCase() || "";
    const otherIsYes =
      otherLabel.startsWith("yes") ||
      otherLabel.startsWith("đạt") ||
      otherLabel.startsWith("có") ||
      otherLabel.startsWith("pass") ||
      otherLabel.startsWith("true");
    const otherIsNo =
      otherLabel.startsWith("no") ||
      otherLabel.startsWith("không") ||
      otherLabel.startsWith("fail") ||
      otherLabel.startsWith("false");

    if (bi === 1 && otherIsYes) {
      effectiveConditionLabel = "No";
    } else if (bi === 0 && otherIsNo) {
      effectiveConditionLabel = "Yes";
    }
  }

  const pValue = (bx.branch.p ?? 0) / 100;
  const pText = formatTimeValue(pValue);
  if (effectiveConditionLabel) {
    const cleanLabel = effectiveConditionLabel.replace(/[\s·\-_:]*(0?\.\d+|\d+%)?$/i, "").trim();
    const baseName = cleanLabel || effectiveConditionLabel;
    return `${baseName} · ${pText}`;
  }
  return pText;
}
