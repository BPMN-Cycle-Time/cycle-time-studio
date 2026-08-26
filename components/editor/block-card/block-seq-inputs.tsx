"use client";

import { useTranslations } from "next-intl";
import type { Block, Task } from "@/types";
import { useEditorStore } from "@/store/useEditorStore";
import { AppInput } from "@/components/ui";
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
    <div className="px-6 flex items-center gap-3 flex-wrap">
      <div className="flex flex-col gap-1 min-w-[140px]">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          {t("task")}
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
          {t("time")}
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
            value={block.time ?? 0}
            onChange={(e) => updateBlock(block.id, { time: parseFloat(e.target.value) || 0 })}
            suffix={unit}
          />
        )}
      </div>
    </div>
  );
}
