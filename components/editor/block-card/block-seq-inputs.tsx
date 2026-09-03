"use client";

import { useTranslations } from "next-intl";
import type { Block, Task } from "@/types";
import { useEditorStore } from "@/store/useEditorStore";
import { AppInput, AppLabel } from "@/components/ui";
import { TaskPicker } from "./task-picker";

interface BlockSeqInputsProps {
  block: Block;
  unit: string;
  tasks?: Task[];
}

export function BlockSeqInputs({ block, unit, tasks = [] }: BlockSeqInputsProps) {
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
    <div className="px-6 flex items-end gap-2">
      {/* TASK picker — takes remaining space */}
      <div className="flex flex-col gap-1 flex-1 overflow-hidden">
        <AppLabel variant="uppercase">{t("task")}</AppLabel>
        <TaskPicker
          tasks={tasks}
          selectedTaskId={block.taskId}
          onChange={handleTaskChange}
          className="w-full"
        />
      </div>

      {/* TIME — fixed width, unit shown inside */}
      {selectedTask ? (
        <AppInput
          label={t("time")}
          labelVariant="uppercase"
          type="number"
          readOnly
          wrapperClassName="w-24 shrink-0"
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
          wrapperClassName="w-24 shrink-0"
          className="font-mono"
          value={block.time ?? 0}
          onChange={(e) => updateBlock(block.id, { time: parseFloat(e.target.value) || 0 })}
          suffix={unit}
        />
      )}
    </div>
  );
}
