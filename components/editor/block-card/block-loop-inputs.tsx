"use client";

import { useTranslations } from "next-intl";
import { Maximize2, Minimize2 } from "lucide-react";
import { BlockMode, type Block, type Task } from "@/types";
import { useEditorStore, SelectionKind } from "@/store/useEditorStore";
import { AppInput, Button, Badge } from "@/components/ui";
import { TaskPicker } from "./task-picker";
import { ProcessFlowSection } from "../process-flow-section";
import { sumArray } from "@/services/engine";

interface BlockLoopInputsProps {
  block: Block;
  unit: string;
  tasks?: Task[];
}

export function BlockLoopInputs({ block, unit, tasks = [] }: BlockLoopInputsProps) {
  const t = useTranslations("editor");
  const { updateBlock, toggleLoopMode } = useEditorStore();

  const isComposite = block.mode === BlockMode.COMPOSITE;
  const selectedTask = tasks.find((t) => t.id === block.taskId);
  const displayTime = selectedTask?.time !== undefined ? selectedTask.time : (block.loopTime ?? 0);
  const loopBodySubTotal = sumArray(block.subBlocks, tasks);

  const handleTaskChange = (taskId: string | null) => {
    const patch: Partial<Block> = { taskId };
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      patch.label = task.name;
    }
    updateBlock(block.id, patch);
  };

  if (isComposite) {
    return (
      <div className="px-6 flex flex-col gap-3">
        {/* Nested loop body container */}
        <div className="border border-dashed rounded-lg p-3 bg-muted/20 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {t("loopBodyFor", { name: block.label || "Loop" })}
            </span>
            <Badge variant="outline" className="font-mono text-xs">
              Σ = {Math.round(loopBodySubTotal * 100) / 100} {unit}
            </Badge>
          </div>

          <ProcessFlowSection
            blocks={block.subBlocks ?? []}
            unit={unit}
            nested
            parentId={block.id}
            parentKind={SelectionKind.BLOCK}
          />
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <AppInput
            label={t("reworkProbability")}
            type="number"
            step="any"
            min="0"
            max="99.9"
            layout="horizontal"
            className="w-20 font-mono"
            wrapperClassName="w-auto text-xs"
            value={block.loopP ?? 0}
            onChange={(e) => updateBlock(block.id, { loopP: parseFloat(e.target.value) || 0 })}
            suffix="%"
          />

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => toggleLoopMode(block.id)}
            title={t("collapseSubProcess")}
          >
            <Minimize2 className="size-3.5" />
            {t("collapseSubProcess")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex flex-col gap-1 min-w-[130px]">
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            {t("taskInLoop")}
          </label>
          <TaskPicker
            tasks={tasks}
            selectedTaskId={block.taskId}
            onChange={handleTaskChange}
            className="w-full"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            {t("loopTime")}
          </label>
          {selectedTask ? (
            <AppInput
              type="number"
              readOnly
              className="w-24 font-mono bg-muted/50 cursor-not-allowed"
              value={displayTime}
              suffix={unit}
              title={t("timeSheetHint")}
            />
          ) : (
            <AppInput
              type="number"
              step="any"
              min="0"
              className="w-24 font-mono"
              value={block.loopTime ?? 0}
              onChange={(e) => updateBlock(block.id, { loopTime: parseFloat(e.target.value) || 0 })}
              suffix={unit}
            />
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            {t("reworkProbability")}
          </label>
          <AppInput
            type="number"
            step="any"
            min="0"
            max="99.9"
            className="w-20 font-mono"
            value={block.loopP ?? 0}
            onChange={(e) => updateBlock(block.id, { loopP: parseFloat(e.target.value) || 0 })}
            suffix="%"
          />
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="h-8 text-xs gap-1.5 self-end"
        onClick={() => toggleLoopMode(block.id)}
        title={t("expandSubProcess")}
      >
        <Maximize2 className="size-3.5" />
        {t("expandSubProcess")}
      </Button>
    </div>
  );
}
