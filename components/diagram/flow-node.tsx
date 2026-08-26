"use client";

import type { GraphNodeData } from "@/types";
import { cn } from "@/utils";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { useEditorStore } from "@/store/useEditorStore";

const KIND_STYLE: Record<GraphNodeData["kind"], string> = {
  start: "bg-foreground text-background border-foreground",
  end: "bg-foreground text-background border-foreground",
  seq: "bg-card border-flow-seq text-foreground",
  xor: "bg-card border-flow-xor text-foreground",
  and: "bg-card border-flow-and text-foreground",
  loop: "bg-card border-flow-loop text-foreground",
};

type FlowNodeType = Node<GraphNodeData, "flow">;

export function FlowNode({ data }: NodeProps<FlowNodeType>) {
  const d = data;
  const isTerminal = d.kind === "start" || d.kind === "end";
  const selectedId = useEditorStore((s) => s.selectedId);
  const isSelected =
    (d.blockId && d.blockId === selectedId) || (d.branchId && d.branchId === selectedId);

  return (
    <div
      className={cn(
        "rounded-control border-2 px-3 py-2 text-xs font-medium shadow-sm min-w-[120px] text-center transition-all duration-150 cursor-pointer hover:shadow-md",
        KIND_STYLE[d.kind],
        isTerminal && "rounded-full min-w-0 px-4",
        isSelected &&
          "ring-2 ring-primary ring-offset-2 ring-offset-background border-primary scale-[1.04] shadow-lg",
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground" />
      <div className="truncate max-w-[160px]">{d.label}</div>
      {d.detail && <div className="text-[0.65rem] opacity-70 font-mono">{d.detail}</div>}
      <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground" />
    </div>
  );
}
