"use client";

import { useTranslations } from "next-intl";
import type { Block, Task } from "@/types";
import { useEditorStore } from "@/store/useEditorStore";
import { AppInput, AppLabel } from "@/components/ui";
import { cn } from "@/utils";
import { TaskPicker } from "./task-picker";

interface BlockSeqInputsProps {
  block: Block;
  unit: string;
  tasks?: Task[];
  nested?: boolean;
}

export function BlockSeqInputs({ block, unit, tasks = [], nested }: BlockSeqInputsProps) {
  const t = useTranslations("editor");
  const { updateBlock } = useEditorStore();

  const selectedTask = tasks.find((t) => t.id === block.taskId);
  const displayTime = selectedTask?.time !== undefined ? selectedTask.time : (block.time ?? 0);

  const handleTaskChange = (taskId: string | null) => {
    const patch: Partial<Block> = { taskId };
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      patch.label = task.name;
    }
    updateBlock(block.id, patch);
  };

  return (
    <div className={cn("flex flex-wrap items-end gap-2", nested ? "px-3" : "px-4 sm:px-5")}>
      {/* TASK picker — takes remaining space or full row on narrow */}
      <div className="flex flex-col gap-1 flex-1 min-w-[10rem]">
        <AppLabel variant="uppercase">{t("task")}</AppLabel>
        <TaskPicker
          tasks={tasks}
          selectedTaskId={block.taskId}
          onChange={handleTaskChange}
          className="w-full"
        />
      </div>

      {/* TIME — fixed width or flexible on wrap */}
      {selectedTask ? (
        <AppInput
          label={t("time")}
          labelVariant="uppercase"
          type="number"
          readOnly
          wrapperClassName="w-28 shrink-0 min-w-[6rem] flex-1 sm:flex-initial"
          className="font-mono bg-muted/50 cursor-not-allowed"
          value={displayTime}
          suffix={unit}
          title={t("timeSheetHint")}
        />
      ) : (
        <AppInput
          label={t("time")}
          labelVariant="uppercase"
          type="number"
          step="any"
          min="0"
          wrapperClassName="w-28 shrink-0 min-w-[6rem] flex-1 sm:flex-initial"
          className="font-mono"
          value={block.time ?? 0}
          onChange={(e) => updateBlock(block.id, { time: parseFloat(e.target.value) || 0 })}
          suffix={unit}
        />
      )}
    </div>
  );
}
