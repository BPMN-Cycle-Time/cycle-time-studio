"use client";

import { memo, useMemo } from "react";
import { DollarSign, Timer } from "lucide-react";
import { BlockType, type Block } from "@/types";
import { Card, AppTooltip } from "@/components/ui";
import { cn } from "@/utils";
import { useEditorStore, SelectionKind } from "@/store/useEditorStore";
import { computeBlockDetails, computeBlockCost } from "@/services/engine";
import { TYPE_META } from "@/constants";
import { BlockHeader } from "./block-header";
import { BlockSeqInputs } from "./block-seq-inputs";
import { BlockLoopInputs } from "./block-loop-inputs";
import { BlockBranches } from "./block-branches";

interface BlockCardProps {
  block: Block;
  index: number;
  unit: string;
  nested?: boolean;
}

export const BlockCard = memo(function BlockCard({ block, index, unit, nested }: BlockCardProps) {
  const meta = TYPE_META[block.type as BlockType];
  const selectedId = useEditorStore((s) => s.selectedId);
  const select = useEditorStore((s) => s.select);
  const tasks = useEditorStore((s) => s.project?.tasks ?? []);
  const currency = useEditorStore((s) => s.project?.currency ?? "");

  const details = useMemo(() => computeBlockDetails(block, tasks), [block, tasks]);
  const cost = useMemo(() => computeBlockCost(block, tasks), [block, tasks]);
  const isSelected = selectedId === block.id;

  const hasCost = isFinite(cost.total) && cost.total > 0;
  const timeDisplay = details.invalid ? "∞" : `${Math.round(details.value * 100) / 100}`;
  const costDisplay = cost.total === Infinity ? "∞" : `${Math.round(cost.total * 100) / 100}`;

  return (
    <Card
      className={cn(
        "relative gap-2.5 py-3 border transition-all overflow-hidden bg-card/95 backdrop-blur-xs",
        nested && "py-2 gap-2",
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

      <BlockHeader block={block} index={index} nested={nested} />

      {block.type === BlockType.SEQ && (
        <BlockSeqInputs block={block} unit={unit} tasks={tasks} nested={nested} />
      )}

      {block.type === BlockType.LOOP && (
        <BlockLoopInputs block={block} unit={unit} tasks={tasks} nested={nested} />
      )}

      {(block.type === BlockType.XOR || block.type === BlockType.AND) && (
        <BlockBranches block={block} unit={unit} tasks={tasks} nested={nested} />
      )}

      {/* Formula & computed result footer */}
      <div
        className={cn(
          "pt-2 mt-1 border-t border-dashed flex flex-wrap items-center justify-between gap-1.5",
          nested ? "mx-3" : "mx-4 sm:mx-5",
        )}
      >
        {/* Formula — truncated with tooltip on hover */}
        <AppTooltip content={details.formula} side="bottom">
          <code className="font-mono text-[10px] sm:text-[11px] text-muted-foreground truncate max-w-[55%] sm:max-w-[65%] cursor-default">
            {details.formula}
          </code>
        </AppTooltip>

        {/* Time + Cost stats */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <div className="flex items-center gap-1 font-mono">
            <Timer className={cn("size-3 shrink-0", meta.text)} />
            <span className="text-xs sm:text-sm font-semibold">{timeDisplay}</span>
            <span className="text-[11px] text-muted-foreground font-normal">{unit}</span>
          </div>
          {hasCost && (
            <div className="flex items-center gap-1 font-mono text-emerald-600 dark:text-emerald-400">
              <DollarSign className="size-3 shrink-0" />
              <span className="text-xs sm:text-sm font-semibold">{costDisplay}</span>
              {currency && <span className="text-[11px] font-normal opacity-70">{currency}</span>}
            </div>
          )}
        </div>
      </div>

      {details.warning && (
        <div className="mx-6 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded px-2.5 py-1 font-medium">
          {details.warning}
        </div>
      )}
    </Card>
  );
});
