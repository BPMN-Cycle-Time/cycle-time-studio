import type { BlockMeasurement, FlowMeasurement, EdgeRoutingStyle } from "@/services/graph";
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
  ) => void;
  onArcPointerDown: (e: React.PointerEvent, targetKey: string) => void;
  onArcPointerUp: (e: React.PointerEvent) => void;
  onInsertClick: (targetId: string, pos: "before" | "after") => void;
}

export function getItemKey(item: BlockMeasurement): string {
  if (item.kind === "task") return `task-${item.block.id}`;
  if (item.kind === "gateway") return `split-gw-${item.block.id}`;
  return `rw-task-${item.block.id}`;
}

export function getItemExitKey(item: BlockMeasurement): string {
  if (item.kind === "task") return `task-${item.block.id}`;
  if (item.kind === "gateway") return `join-gw-${item.block.id}`;
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

  const signY = endY > startY ? 1 : -1;
  const radius = Math.min(r, Math.abs(elbowX - startX) / 2, Math.abs(endY - startY) / 2);

  const p1X = elbowX - radius;
  const p1Y = startY;
  const p2X = elbowX;
  const p2Y = startY + signY * radius;
  const p3X = elbowX;
  const p3Y = endY - signY * radius;
  const p4X = elbowX + radius;
  const p4Y = endY;

  return `M ${startX} ${startY} L ${p1X} ${p1Y} Q ${elbowX} ${startY} ${p2X} ${p2Y} L ${p3X} ${p3Y} Q ${elbowX} ${endY} ${p4X} ${p4Y} L ${endX} ${endY}`;
}
