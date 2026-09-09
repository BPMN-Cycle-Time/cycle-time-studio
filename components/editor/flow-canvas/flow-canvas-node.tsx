"use client";

import { memo, useMemo, useState, useEffect } from "react";
import { Handle, Position, useUpdateNodeInternals, type NodeProps, type Node } from "@xyflow/react";
import {
  Workflow,
  RotateCw,
  Split,
  GitFork,
  Copy,
  Trash2,
  Timer,
  DollarSign,
  AlertTriangle,
} from "lucide-react";
import { BlockType, type Block, type Task } from "@/types";
import { Button, Badge, Tabs, TabsList, TabsTrigger, AppTooltip } from "@/components/ui";
import { computeBlockDetails, computeBlockCost } from "@/services/engine";
import { cleanTaskName, cn } from "@/utils";
import { useTranslations } from "next-intl";
import { FlowCanvasNodeConfig } from "./flow-canvas-node-config";

export interface FlowCanvasNodeData extends Record<string, unknown> {
  block: Block;
  index: number;
  unit: string;
  currency: string;
  tasks: Task[];
  isSelected: boolean;
  parentContext?: string;
  onUpdateBlock: (id: string, patch: Partial<Block>) => void;
  onRemoveBlock: (id: string) => void;
  onDuplicateBlock: (block: Block) => void;
  onSelect: (id: string) => void;
}

export type FlowCanvasNodeType = Node<FlowCanvasNodeData, "flowBlock">;

const BLOCK_ICONS: Record<BlockType, React.ComponentType<{ className?: string }>> = {
  [BlockType.SEQ]: Workflow,
  [BlockType.LOOP]: RotateCw,
  [BlockType.XOR]: Split,
  [BlockType.AND]: GitFork,
};

const BLOCK_ACCENTS: Record<BlockType, { bg: string; text: string; border: string }> = {
  [BlockType.SEQ]: {
    bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/30",
  },
  [BlockType.LOOP]: {
    bg: "bg-amber-500/10 dark:bg-amber-500/20",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/30",
  },
  [BlockType.XOR]: {
    bg: "bg-purple-500/10 dark:bg-purple-500/20",
    text: "text-purple-600 dark:text-purple-400",
    border: "border-purple-500/30",
  },
  [BlockType.AND]: {
    bg: "bg-blue-500/10 dark:bg-blue-500/20",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-500/30",
  },
};

export const FlowCanvasNode = memo(function FlowCanvasNode({
  data,
  selected,
}: NodeProps<FlowCanvasNodeType>) {
  const {
    block,
    index,
    unit,
    currency,
    tasks,
    onUpdateBlock,
    onRemoveBlock,
    onDuplicateBlock,
    onSelect,
  } = data;

  const tEd = useTranslations("editor");
  const tTypes = useTranslations("common.blockTypes");
  const [activeTab, setActiveTab] = useState<"config" | "result">("config");
  const updateNodeInternals = useUpdateNodeInternals();

  const blockType = (block.type as BlockType) || BlockType.SEQ;
  const Icon = BLOCK_ICONS[blockType] || Workflow;
  const accent = BLOCK_ACCENTS[blockType] || BLOCK_ACCENTS[BlockType.SEQ];
  const typeLabel = tTypes(blockType);

  const details = useMemo(() => computeBlockDetails(block, tasks), [block, tasks]);
  const cost = useMemo(() => computeBlockCost(block, tasks), [block, tasks]);

  const isHighlighted = selected || data.isSelected;

  useEffect(() => {
    updateNodeInternals(block.id);
  }, [block.id, updateNodeInternals, activeTab, block.type, block.mode]);

  return (
    <div
      onClick={() => onSelect(block.id)}
      className={cn(
        "w-[300px] rounded-2xl bg-card/95 backdrop-blur-md border-2 transition-[border-color,box-shadow] duration-150 shadow-md hover:shadow-xl text-xs",
        isHighlighted
          ? "border-purple-500 ring-4 ring-purple-500/20 shadow-purple-500/10 shadow-lg"
          : "border-border/80 hover:border-border",
        details.invalid && "border-destructive/80 bg-destructive/5",
      )}
    >
      {/* Target Handle (Left Input Port) */}
      <Handle
        type="target"
        position={Position.Left}
        id="target-left"
        className="w-3.5! h-3.5! -left-2! bg-card! border-2! border-foreground/60! rounded-full! transition-transform hover:scale-125! cursor-crosshair! shadow-xs"
      />

      {/* Source Handle (Right Output Port) */}
      <Handle
        type="source"
        position={Position.Right}
        id="source-right"
        className="w-3.5! h-3.5! -right-2! bg-emerald-500! border-2! border-card! rounded-full! transition-transform hover:scale-125! cursor-crosshair! shadow-xs"
      />

      {/* Loop Handles (Bottom Target & Bottom Source for rework loops) */}
      <Handle
        type="target"
        position={Position.Bottom}
        id="target-bottom"
        style={{ left: "38%" }}
        className="w-3! h-3! -bottom-1.5! bg-amber-500! border-2! border-card! rounded-full! opacity-60 hover:opacity-100 transition-opacity"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="source-bottom"
        style={{ left: "62%" }}
        className="w-3! h-3! -bottom-1.5! bg-amber-500! border-2! border-card! rounded-full! opacity-60 hover:opacity-100 transition-opacity"
      />

      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 p-3 pb-2 border-b border-border/50">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border",
              accent.bg,
              accent.text,
              accent.border,
            )}
          >
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <div className="font-bold text-foreground text-xs truncate max-w-[130px]">
                {cleanTaskName(block.label) || typeLabel}
              </div>
              {data.parentContext && (
                <Badge
                  variant="outline"
                  className="text-[9px] font-mono px-1 py-0 text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20 shrink-0"
                >
                  {data.parentContext}
                </Badge>
              )}
            </div>
            <div className="text-[10px] font-mono text-muted-foreground truncate">
              {typeLabel} • #{index + 1}
            </div>
          </div>
        </div>

        {/* Action Controls: Duplicate, Delete */}
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <AppTooltip content={tEd("duplicateStep")}>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-md text-muted-foreground hover:text-foreground"
              onClick={() => onDuplicateBlock(block)}
              aria-label={tEd("duplicateStep")}
            >
              <Copy className="w-3 h-3" />
            </Button>
          </AppTooltip>
          <AppTooltip content={tEd("removeStep")}>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-md text-muted-foreground hover:text-destructive"
              onClick={() => onRemoveBlock(block.id)}
              aria-label={tEd("removeStep")}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </AppTooltip>
        </div>
      </div>

      {/* Segmented Pill Tabs: [Config] [Result] */}
      <div className="px-3 pt-2.5" onClick={(e) => e.stopPropagation()}>
        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as "config" | "result")}
          className="w-full gap-0"
        >
          <TabsList className="grid grid-cols-2 w-full h-8 p-0.5 rounded-lg bg-muted/60">
            <TabsTrigger
              value="config"
              className="text-[11px] py-1 h-full rounded-md data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              {tEd("tabConfig")}
            </TabsTrigger>
            <TabsTrigger
              value="result"
              className="text-[11px] py-1 h-full rounded-md data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              {tEd("tabDetails")}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Main Content Area */}
      <div className="p-3 pt-2 space-y-2.5" onClick={(e) => e.stopPropagation()}>
        {activeTab === "config" ? (
          <FlowCanvasNodeConfig
            block={block}
            blockType={blockType}
            unit={unit}
            tasks={tasks}
            details={details}
            onUpdateBlock={onUpdateBlock}
          />
        ) : (
          /* Result Tab */
          <div className="space-y-2 py-1">
            <div className="p-2 rounded-xl bg-muted/40 space-y-1.5 font-mono">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1 font-sans">
                  <Timer className="w-3 h-3 text-emerald-500" />
                  {tEd("expectedCycleTime")}:
                </span>
                <span className="font-bold text-foreground">
                  {Math.round(details.value * 100) / 100} {unit}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1 font-sans">
                  <DollarSign className="w-3 h-3 text-emerald-600" />
                  {tEd("totalCost")}:
                </span>
                <span className="font-bold text-foreground">
                  {cost.total === Infinity ? "∞" : Math.round(cost.total * 100) / 100} {currency}
                </span>
              </div>
            </div>

            {details.warning && (
              <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{details.warning}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mini Stats Footer Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-border/50 bg-muted/20 rounded-b-2xl text-[10px] text-muted-foreground font-mono">
        <span className="flex items-center gap-1">
          <Timer className="w-3 h-3 text-primary" />
          {Math.round(details.value * 100) / 100} {unit}
        </span>
        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
          <DollarSign className="w-3 h-3" />
          {cost.total === Infinity ? "∞" : Math.round(cost.total * 100) / 100} {currency}
        </span>
      </div>
    </div>
  );
});
