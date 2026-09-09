"use client";

import { memo, useState, useMemo, useEffect } from "react";
import { Handle, Position, useUpdateNodeInternals, type NodeProps, type Node } from "@xyflow/react";
import { GitBranch, Trash2, Timer, DollarSign, User, Percent } from "lucide-react";
import { BlockType, type Branch, type Task } from "@/types";
import {
  Button,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  AppInput,
  AppSelect,
  AppTooltip,
  type SelectOption,
} from "@/components/ui";
import { cleanTaskName, cn } from "@/utils";
import { useTranslations } from "next-intl";

export interface FlowCanvasBranchNodeData extends Record<string, unknown> {
  branch: Branch;
  parentBlockId: string;
  parentBlockType: BlockType;
  index: number;
  unit: string;
  currency: string;
  tasks: Task[];
  isSelected: boolean;
  onUpdateBranch: (blockId: string, branchId: string, patch: Partial<Branch>) => void;
  onRemoveBranch: (blockId: string, branchId: string) => void;
  onSelect: (id: string) => void;
}

export type FlowCanvasBranchNodeType = Node<FlowCanvasBranchNodeData, "flowBranch">;

export const FlowCanvasBranchNode = memo(function FlowCanvasBranchNode({
  data,
  selected,
}: NodeProps<FlowCanvasBranchNodeType>) {
  const {
    branch,
    parentBlockId,
    parentBlockType,
    index,
    unit,
    currency,
    tasks,
    onUpdateBranch,
    onRemoveBranch,
    onSelect,
  } = data;

  const tEd = useTranslations("editor");
  const [activeTab, setActiveTab] = useState<"config" | "result">("config");
  const updateNodeInternals = useUpdateNodeInternals();

  const isXor = parentBlockType === BlockType.XOR;
  const isHighlighted = selected || data.isSelected;
  const nodeId = `branch_${branch.id}`;

  useEffect(() => {
    updateNodeInternals(nodeId);
  }, [nodeId, updateNodeInternals, activeTab, isXor]);

  const taskOptions: SelectOption<string>[] = useMemo(
    () => [
      { value: "custom", label: tEd("customTime") },
      ...tasks.map((t) => ({
        value: t.id,
        label: `${t.name} (${t.time ?? 0} ${unit})`,
      })),
    ],
    [tasks, unit, tEd],
  );

  const handleTaskSelect = (taskId: string) => {
    if (taskId === "custom") {
      onUpdateBranch(parentBlockId, branch.id, { taskId: undefined });
      return;
    }
    const t = tasks.find((item) => item.id === taskId);
    if (t) {
      onUpdateBranch(parentBlockId, branch.id, {
        taskId: t.id,
        label: t.name,
        t: t.time,
      });
    }
  };

  const branchTime = branch.t ?? 0;
  const branchCost = branch.cost ?? 0;

  return (
    <div
      onClick={() => onSelect(branch.id)}
      className={cn(
        "w-[300px] rounded-2xl bg-card/95 backdrop-blur-md border-2 transition-[border-color,box-shadow] duration-150 shadow-md hover:shadow-xl text-xs",
        isHighlighted
          ? "border-purple-500 ring-4 ring-purple-500/20 shadow-purple-500/10 shadow-lg"
          : "border-border/80 hover:border-border",
      )}
    >
      {/* Target Handle (Left Input Port from Gateway Split) */}
      <Handle
        type="target"
        position={Position.Left}
        id="target-left"
        className="w-3.5! h-3.5! -left-2! bg-card! border-2! border-foreground/60! rounded-full! transition-transform hover:scale-125! cursor-crosshair! shadow-xs"
      />

      {/* Source Handle (Right Output Port to Next Step / Join) */}
      <Handle
        type="source"
        position={Position.Right}
        id="source-right"
        className="w-3.5! h-3.5! -right-2! bg-emerald-500! border-2! border-card! rounded-full! transition-transform hover:scale-125! cursor-crosshair! shadow-xs"
      />

      {/* Loop Handles (Bottom Target & Bottom Source) */}
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
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30">
            <GitBranch className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-foreground text-xs truncate max-w-[150px]">
              {cleanTaskName(branch.label) || tEd("branchWithIndex", { index: index + 1 })}
            </div>
            <div className="text-[10px] font-mono text-muted-foreground truncate">
              {isXor
                ? tEd("branchWithProb", { p: branch.p ?? 0 })
                : tEd("branchWithIndex", { index: index + 1 })}
            </div>
          </div>
        </div>

        {/* Delete Action Button */}
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <AppTooltip content={tEd("removeStep")}>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-md text-muted-foreground hover:text-destructive"
              onClick={() => onRemoveBranch(parentBlockId, branch.id)}
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
          <div className="space-y-2">
            {/* Task Selection */}
            {tasks.length > 0 && (
              <AppSelect
                label={tEd("task")}
                labelVariant="uppercase"
                size="sm"
                triggerClassName="h-7 text-xs bg-background"
                value={branch.taskId ?? "custom"}
                onValueChange={handleTaskSelect}
                options={taskOptions}
                labelClassName="text-[10px] uppercase font-semibold text-muted-foreground"
              />
            )}

            {/* Branch Label */}
            <AppInput
              label={tEd("blockNamePlaceholder")}
              labelVariant="uppercase"
              value={branch.label}
              onChange={(e) => onUpdateBranch(parentBlockId, branch.id, { label: e.target.value })}
              placeholder={tEd("branchNamePlaceholder")}
              className="h-7 text-xs bg-background"
              labelClassName="text-[10px] uppercase font-semibold text-muted-foreground"
            />

            {/* Probability & Duration Grid */}
            <div className="grid grid-cols-2 gap-2">
              {isXor ? (
                <AppInput
                  label={
                    <span className="flex items-center gap-1">
                      <Percent className="w-3 h-3 text-purple-500" />
                      {tEd("probability")} (%)
                    </span>
                  }
                  labelVariant="uppercase"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={branch.p ?? 0}
                  onChange={(e) =>
                    onUpdateBranch(parentBlockId, branch.id, {
                      p: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="h-7 text-xs font-mono bg-background text-right pr-2"
                  labelClassName="text-[10px] uppercase font-semibold text-muted-foreground flex items-center gap-1"
                />
              ) : (
                <AppInput
                  label={
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-blue-500" />
                      {tEd("resource")}
                    </span>
                  }
                  labelVariant="uppercase"
                  value={branch.resource ?? ""}
                  onChange={(e) =>
                    onUpdateBranch(parentBlockId, branch.id, { resource: e.target.value })
                  }
                  placeholder={tEd("resourcePlaceholder")}
                  className="h-7 text-xs bg-background"
                  labelClassName="text-[10px] uppercase font-semibold text-muted-foreground flex items-center gap-1"
                />
              )}

              <AppInput
                label={
                  <span className="flex items-center gap-1">
                    <Timer className="w-3 h-3 text-emerald-500" />
                    {tEd("time")} ({unit})
                  </span>
                }
                labelVariant="uppercase"
                type="number"
                step="any"
                min="0"
                value={branch.t ?? 0}
                disabled={!!branch.taskId}
                onChange={(e) =>
                  onUpdateBranch(parentBlockId, branch.id, {
                    t: parseFloat(e.target.value) || 0,
                  })
                }
                className="h-7 text-xs font-mono bg-background text-right pr-2"
                labelClassName="text-[10px] uppercase font-semibold text-muted-foreground flex items-center gap-1"
              />
            </div>

            {isXor && (
              <AppInput
                label={
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3 text-blue-500" />
                    {tEd("resource")}
                  </span>
                }
                labelVariant="uppercase"
                value={branch.resource ?? ""}
                onChange={(e) =>
                  onUpdateBranch(parentBlockId, branch.id, { resource: e.target.value })
                }
                placeholder={tEd("resourcePlaceholder")}
                className="h-7 text-xs bg-background"
                labelClassName="text-[10px] uppercase font-semibold text-muted-foreground flex items-center gap-1"
              />
            )}
          </div>
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
                  {Math.round(branchTime * 100) / 100} {unit}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1 font-sans">
                  <DollarSign className="w-3 h-3 text-emerald-600" />
                  {tEd("totalCost")}:
                </span>
                <span className="font-bold text-foreground">
                  {Math.round(branchCost * 100) / 100} {currency}
                </span>
              </div>
            </div>

            {isXor && (
              <div className="flex items-center justify-between p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-medium">
                <span>{tEd("branchProbability")}</span>
                <Badge variant="outline" className="font-mono">
                  {branch.p ?? 0}%
                </Badge>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mini Stats Footer Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-border/50 bg-muted/20 rounded-b-2xl text-[10px] text-muted-foreground font-mono">
        <span className="flex items-center gap-1">
          <Timer className="w-3 h-3 text-primary" />
          {Math.round(branchTime * 100) / 100} {unit}
        </span>
        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
          <DollarSign className="w-3 h-3" />
          {Math.round(branchCost * 100) / 100} {currency}
        </span>
      </div>
    </div>
  );
});
