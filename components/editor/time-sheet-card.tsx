"use client";

import { useTranslations } from "next-intl";
import { Plus, X } from "lucide-react";
import type { Block, Task } from "@/types";
import { useEditorStore } from "@/store/useEditorStore";
import { AppCard, Button, AppInput, Badge } from "@/components/ui";

interface TimeSheetCardProps {
  tasks: Task[];
  blocks: Block[];
  unit: string;
}

/** Recursively count how many times a task ID is used across top-level & nested blocks/branches. */
function countTaskUsage(blocks: Block[], taskId: string): number {
  let count = 0;
  function walk(items: Block[]) {
    for (const b of items) {
      if (b.taskId === taskId) count++;
      if (b.branches) {
        for (const br of b.branches) {
          if (br.taskId === taskId && br.mode !== "composite") count++;
          if (br.subBlocks) walk(br.subBlocks);
        }
      }
      if (b.subBlocks) walk(b.subBlocks);
    }
  }
  walk(blocks);
  return count;
}

export function TimeSheetCard({ tasks, blocks, unit }: TimeSheetCardProps) {
  const tEd = useTranslations("editor");
  const { addTask, updateTask, removeTask } = useEditorStore();

  const handleAddTask = () => {
    const letter = String.fromCharCode(65 + (tasks.length % 26));
    addTask(`Task ${letter}`, 1);
  };

  return (
    <AppCard title={tEd("timeSheet")}>
      <div className="flex flex-col gap-3">
        {tasks.length === 0 ? (
          <div className="text-sm text-muted-foreground py-2 italic text-center">
            {tEd("noTasksYet")}
          </div>
        ) : (
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b bg-muted/40 uppercase tracking-wider font-semibold text-muted-foreground">
                  <th className="py-2 px-3">{tEd("task")}</th>
                  <th className="py-2 px-3 w-32">
                    {tEd("time")} ({unit})
                  </th>
                  <th className="py-2 px-3 w-20 text-right">{tEd("used")}</th>
                  <th className="py-2 px-3 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {tasks.map((task) => {
                  const usage = countTaskUsage(blocks, task.id);
                  return (
                    <tr key={task.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-1.5 px-3">
                        <AppInput
                          wrapperClassName="w-full"
                          inputClassName="h-8 border-transparent bg-transparent shadow-none font-medium hover:border-input focus-visible:border-input"
                          value={task.name}
                          onChange={(e) => updateTask(task.id, { name: e.target.value })}
                        />
                      </td>
                      <td className="py-1.5 px-3">
                        <AppInput
                          type="number"
                          step="any"
                          min="0"
                          wrapperClassName="w-full"
                          inputClassName="h-8 font-mono text-xs"
                          value={task.time ?? 0}
                          onChange={(e) =>
                            updateTask(task.id, { time: parseFloat(e.target.value) || 0 })
                          }
                        />
                      </td>
                      <td className="py-1.5 px-3 text-right">
                        {usage > 0 ? (
                          <Badge
                            variant="secondary"
                            className="font-mono text-[10px] px-1.5 py-0.5"
                          >
                            {usage}×
                          </Badge>
                        ) : (
                          <span className="text-[11px] text-destructive/80 font-mono">
                            {tEd("unused")}
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 px-3 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-destructive"
                          onClick={() => removeTask(task.id)}
                          aria-label={tEd("removeStep")}
                        >
                          <X className="size-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-1 flex-wrap">
          <p className="text-[11px] text-muted-foreground flex-1 min-w-[200px]">
            {tEd("timeSheetHint")}
          </p>
          <Button variant="default" size="sm" onClick={handleAddTask} className="shrink-0">
            <Plus className="size-3.5" /> {tEd("addTask")}
          </Button>
        </div>
      </div>
    </AppCard>
  );
}
