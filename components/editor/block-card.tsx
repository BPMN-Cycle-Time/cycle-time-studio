"use client";

import { BlockType, type Block } from "@/types";
import { Card } from "@/components/ui";
import { cn } from "@/utils";
import { useEditorStore, SelectionKind } from "@/store/useEditorStore";
import { computeBlockDetails } from "@/services/engine";
import { TYPE_META } from "@/constants";
import { BlockHeader } from "./block-card/block-header";
import { BlockSeqInputs } from "./block-card/block-seq-inputs";
import { BlockLoopInputs } from "./block-card/block-loop-inputs";
import { BlockBranches } from "./block-card/block-branches";

interface BlockCardProps {
  block: Block;
  index: number;
  unit: string;
}

export function BlockCard({ block, index, unit }: BlockCardProps) {
  const meta = TYPE_META[block.type as BlockType];
  const { project, selectedId, select } = useEditorStore();
  const tasks = project?.tasks ?? [];

  const details = computeBlockDetails(block, tasks);
  const isSelected = selectedId === block.id;

  return (
    <Card
      className={cn(
        "relative gap-3 py-3.5 border transition-all overflow-hidden bg-card/95 backdrop-blur-xs",
        isSelected
          ? "border-primary ring-2 ring-primary/20 shadow-md"
          : "border-border/80 hover:border-border hover:shadow-xs",
        details.invalid && "border-destructive/80 bg-destructive/5",
      )}
      onClick={(e) => {
        // Stop propagation if user clicks interactive controls
        if ((e.target as HTMLElement).closest("input, select, button, textarea")) return;
        select(SelectionKind.BLOCK, block.id);
      }}
    >
      {/* Sleek vertical colored indicator pill */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-1.5 transition-colors", meta.bg)} />

      {/* Subtle soft background gradient glow on the left edge */}
      <div
        className={cn(
          "absolute inset-y-0 left-0 w-24 bg-gradient-to-r pointer-events-none opacity-40 transition-opacity",
          meta.lightBg,
        )}
      />

      <BlockHeader block={block} index={index} />

      {block.type === BlockType.SEQ && <BlockSeqInputs block={block} unit={unit} tasks={tasks} />}

      {block.type === BlockType.LOOP && <BlockLoopInputs block={block} unit={unit} tasks={tasks} />}

      {(block.type === BlockType.XOR || block.type === BlockType.AND) && (
        <BlockBranches block={block} unit={unit} tasks={tasks} />
      )}

      {/* Formula & computed result footer */}
      <div className="mx-6 pt-2.5 mt-1 border-t border-dashed flex items-center justify-between gap-3 flex-wrap">
        <code className="font-mono text-[11px] text-muted-foreground break-all">
          {details.formula}
        </code>
        <div className="font-mono text-sm font-semibold shrink-0">
          {details.invalid ? "∞" : Math.round(details.value * 100) / 100}{" "}
          <span className="text-xs text-muted-foreground font-normal">{unit}</span>
        </div>
      </div>

      {details.warning && (
        <div className="mx-6 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded px-2.5 py-1 font-medium">
          {details.warning}
        </div>
      )}
    </Card>
  );
}
