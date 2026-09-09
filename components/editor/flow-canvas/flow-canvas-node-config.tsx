"use client";

import { memo, useState, useMemo } from "react";
import { BlockType, type Block, type Task } from "@/types";
import { Badge, Button, AppSelect, AppInput, type SelectOption } from "@/components/ui";
import { Timer, User, ChevronDown } from "lucide-react";
import { cn } from "@/utils";
import { useTranslations } from "next-intl";
import type { BlockComputationResult } from "@/services/engine";

interface FlowCanvasNodeConfigProps {
  block: Block;
  blockType: BlockType;
  unit: string;
  tasks: Task[];
  details: BlockComputationResult;
  onUpdateBlock: (id: string, patch: Partial<Block>) => void;
}

export const FlowCanvasNodeConfig = memo(function FlowCanvasNodeConfig({
  block,
  blockType,
  unit,
  tasks,
  details,
  onUpdateBlock,
}: FlowCanvasNodeConfigProps) {
  const tEd = useTranslations("editor");
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

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
      onUpdateBlock(block.id, { taskId: undefined });
      return;
    }
    const t = tasks.find((item) => item.id === taskId);
    if (t) {
      onUpdateBlock(block.id, {
        taskId: t.id,
        label: t.name,
        time: t.time,
      });
    }
  };

  return (
    <div className="space-y-2">
      {/* Sequential Task Configuration */}
      {blockType === BlockType.SEQ && (
        <>
          {tasks.length > 0 && (
            <AppSelect
              label={tEd("task")}
              labelVariant="uppercase"
              size="sm"
              triggerClassName="h-7 text-xs bg-background"
              value={block.taskId ?? "custom"}
              onValueChange={handleTaskSelect}
              options={taskOptions}
              labelClassName="text-[10px] uppercase font-semibold text-muted-foreground"
            />
          )}

          <AppInput
            label={tEd("blockNamePlaceholder")}
            labelVariant="uppercase"
            value={block.label}
            onChange={(e) => onUpdateBlock(block.id, { label: e.target.value })}
            placeholder={tEd("blockNamePlaceholder")}
            className="h-7 text-xs bg-background"
            labelClassName="text-[10px] uppercase font-semibold text-muted-foreground"
          />

          <div className="grid grid-cols-2 gap-2">
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
              value={block.time ?? 0}
              disabled={!!block.taskId}
              onChange={(e) => onUpdateBlock(block.id, { time: parseFloat(e.target.value) || 0 })}
              className="h-7 text-xs font-mono bg-background text-right pr-2"
              labelClassName="text-[10px] uppercase font-semibold text-muted-foreground flex items-center gap-1"
            />

            <AppInput
              label={
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3 text-blue-500" />
                  {tEd("resource")}
                </span>
              }
              labelVariant="uppercase"
              value={block.resource ?? ""}
              onChange={(e) => onUpdateBlock(block.id, { resource: e.target.value })}
              placeholder={tEd("resourcePlaceholder")}
              className="h-7 text-xs bg-background"
              labelClassName="text-[10px] uppercase font-semibold text-muted-foreground flex items-center gap-1"
            />
          </div>
        </>
      )}

      {/* Loop Block Configuration */}
      {blockType === BlockType.LOOP && (
        <>
          <AppInput
            label={tEd("blockNamePlaceholder")}
            labelVariant="uppercase"
            value={block.label}
            onChange={(e) => onUpdateBlock(block.id, { label: e.target.value })}
            className="h-7 text-xs bg-background"
            labelClassName="text-[10px] uppercase font-semibold text-muted-foreground"
          />

          <div className="grid grid-cols-2 gap-2">
            <AppInput
              label={tEd("reworkProbability")}
              labelVariant="uppercase"
              type="number"
              min="0"
              max="99.9"
              step="1"
              value={block.loopP ?? 20}
              onChange={(e) =>
                onUpdateBlock(block.id, {
                  loopP: parseFloat(e.target.value) || 0,
                })
              }
              className="h-7 text-xs font-mono bg-background text-right pr-2"
              labelClassName="text-[10px] uppercase font-semibold text-muted-foreground"
            />

            <AppInput
              label={`${tEd("loopTime")} (${unit})`}
              labelVariant="uppercase"
              type="number"
              step="any"
              min="0"
              value={block.loopTime ?? block.time ?? 1}
              onChange={(e) =>
                onUpdateBlock(block.id, {
                  loopTime: parseFloat(e.target.value) || 0,
                })
              }
              className="h-7 text-xs font-mono bg-background text-right pr-2"
              labelClassName="text-[10px] uppercase font-semibold text-muted-foreground"
            />
          </div>
        </>
      )}

      {/* Exclusive (XOR) / Parallel (AND) Configuration */}
      {(blockType === BlockType.XOR || blockType === BlockType.AND) && (
        <div className="space-y-2">
          <AppInput
            label={tEd("blockNamePlaceholder")}
            labelVariant="uppercase"
            value={block.label}
            onChange={(e) => onUpdateBlock(block.id, { label: e.target.value })}
            className="h-7 text-xs bg-background"
            labelClassName="text-[10px] uppercase font-semibold text-muted-foreground"
          />

          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] uppercase font-semibold text-muted-foreground">
              <span>{tEd("branchesCount", { count: block.branches?.length ?? 0 })}</span>
              {blockType === BlockType.XOR && (
                <span className="font-mono text-purple-600 dark:text-purple-400">
                  {block.branches?.reduce((acc, b) => acc + (b.p ?? 0), 0)}%
                </span>
              )}
            </div>
            <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
              {block.branches?.map((br) => (
                <div
                  key={br.id}
                  className="flex items-center justify-between gap-1 p-1 px-1.5 rounded bg-muted/40 text-[11px]"
                >
                  <span className="truncate flex-1 font-medium">{br.label}</span>
                  {blockType === BlockType.XOR && (
                    <Badge variant="outline" className="text-[10px] font-mono px-1 py-0">
                      {br.p ?? 0}%
                    </Badge>
                  )}
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {br.t} {unit}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Advanced configurations collapsible */}
      <div className="pt-1">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setIsAdvancedOpen((v) => !v)}
          className="w-full flex items-center justify-between text-[10px] font-semibold text-muted-foreground hover:text-foreground py-1 h-auto px-0 rounded-none border-t border-border/40 hover:bg-transparent"
        >
          <span>{tEd("advancedConfig")}</span>
          <ChevronDown
            className={cn("w-3 h-3 transition-transform", isAdvancedOpen && "rotate-180")}
          />
        </Button>

        {isAdvancedOpen && (
          <div className="pt-1 text-[10px] text-muted-foreground space-y-1 font-mono">
            <div className="flex justify-between">
              <span>{tEd("blockIdLabel")}</span>
              <span className="text-foreground">{block.id}</span>
            </div>
            {details.formula && (
              <div className="flex justify-between">
                <span>{tEd("formulaLabel")}</span>
                <span className="text-foreground truncate max-w-[150px]">{details.formula}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
