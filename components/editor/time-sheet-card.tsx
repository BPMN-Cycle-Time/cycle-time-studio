"use client";

import { useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Plus, X } from "lucide-react";
import type { Block, Task } from "@/types";
import { useEditorStore } from "@/store/useEditorStore";
import { AppCard, Button, AppInput, Badge, DataTable, type TableColumn } from "@/components/ui";
import { CURRENCIES, DEFAULT_CURRENCY } from "@/constants";

interface TimeSheetCardProps {
  tasks: Task[];
  blocks: Block[];
  unit: string;
  currency?: string;
}

interface TaskRow extends Task {
  usage: number;
  totalCost: number;
}

/** Recursively count task usage into a single lookup map. */
function buildTaskUsageMap(blocks: Block[]): Record<string, number> {
  const map: Record<string, number> = {};
  function walk(items: Block[]) {
    for (const b of items) {
      if (b.taskId) map[b.taskId] = (map[b.taskId] || 0) + 1;
      if (b.branches) {
        for (const br of b.branches) {
          if (br.taskId && br.mode !== "composite") {
            map[br.taskId] = (map[br.taskId] || 0) + 1;
          }
          if (br.subBlocks) walk(br.subBlocks);
        }
      }
      if (b.subBlocks) walk(b.subBlocks);
    }
  }
  walk(blocks);
  return map;
}

export function TimeSheetCard({
  tasks,
  blocks,
  unit,
  currency = DEFAULT_CURRENCY,
}: TimeSheetCardProps) {
  const tEd = useTranslations("editor");
  const addTask = useEditorStore((s) => s.addTask);
  const updateTask = useEditorStore((s) => s.updateTask);
  const removeTask = useEditorStore((s) => s.removeTask);

  const currencySymbol = CURRENCIES.find((c) => c.code === currency)?.symbol ?? "$";
  const usageMap = useMemo(() => buildTaskUsageMap(blocks), [blocks]);

  const taskRows: TaskRow[] = useMemo(
    () =>
      tasks.map((t) => {
        const time = t.time ?? 0;
        const rate = t.hourlyRate ?? 0;
        const fixed = t.fixedCost ?? 0;
        return {
          ...t,
          usage: usageMap[t.id] ?? 0,
          totalCost: time * rate + fixed,
        };
      }),
    [tasks, usageMap],
  );

  const columns: TableColumn<TaskRow>[] = useMemo(
    () => [
      {
        key: "name",
        header: tEd("task"),
        sticky: "left",
        className: "w-[120px] min-w-[120px] max-w-[140px]",
        headerClassName: "w-[120px] min-w-[120px] max-w-[140px]",
        render: (row) => (
          <AppInput
            wrapperClassName="w-full"
            inputClassName="h-8 border-transparent bg-transparent shadow-none font-medium hover:border-input focus-visible:border-input text-xs"
            value={row.name}
            onChange={(e) => updateTask(row.id, { name: e.target.value })}
          />
        ),
      },
      {
        key: "resource",
        header: tEd("resource"),
        className: "w-[120px] min-w-[110px]",
        headerClassName: "w-[120px] min-w-[110px]",
        render: (row) => (
          <AppInput
            wrapperClassName="w-full"
            inputClassName="h-8 border-transparent bg-transparent shadow-none hover:border-input focus-visible:border-input text-xs"
            placeholder={tEd("resourcePlaceholder")}
            value={row.resource ?? ""}
            onChange={(e) => updateTask(row.id, { resource: e.target.value })}
          />
        ),
      },
      {
        key: "time",
        header: `${tEd("time")} (${unit})`,
        render: (row) => (
          <AppInput
            type="number"
            step="any"
            min="0"
            wrapperClassName="w-full min-w-[70px] max-w-[90px]"
            inputClassName="h-8 font-mono text-xs"
            value={row.time ?? 0}
            onChange={(e) => updateTask(row.id, { time: parseFloat(e.target.value) || 0 })}
          />
        ),
      },
      {
        key: "hourlyRate",
        header: `${tEd("hourlyRate")} (${currencySymbol}/${unit})`,
        render: (row) => (
          <AppInput
            type="number"
            step="any"
            min="0"
            wrapperClassName="w-full min-w-[75px] max-w-[95px]"
            inputClassName="h-8 font-mono text-xs"
            value={row.hourlyRate ?? 0}
            onChange={(e) => updateTask(row.id, { hourlyRate: parseFloat(e.target.value) || 0 })}
          />
        ),
      },
      {
        key: "fixedCost",
        header: `${tEd("fixedCost")} (${currencySymbol})`,
        render: (row) => (
          <AppInput
            type="number"
            step="any"
            min="0"
            wrapperClassName="w-full min-w-[75px] max-w-[95px]"
            inputClassName="h-8 font-mono text-xs"
            value={row.fixedCost ?? 0}
            onChange={(e) => updateTask(row.id, { fixedCost: parseFloat(e.target.value) || 0 })}
          />
        ),
      },
      {
        key: "totalCost",
        header: `${tEd("costPerRun")}`,
        render: (row) => (
          <div className="font-mono text-xs font-semibold text-foreground whitespace-nowrap">
            {currencySymbol}
            {row.totalCost.toFixed(2)}
          </div>
        ),
      },
      {
        key: "usage",
        header: tEd("used"),
        render: (row) => (
          <div className="text-right">
            {row.usage > 0 ? (
              <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0.5">
                {row.usage}×
              </Badge>
            ) : (
              <span className="text-[11px] text-destructive/80 font-mono">{tEd("unused")}</span>
            )}
          </div>
        ),
      },
      {
        key: "actions",
        header: "",
        sortable: false,
        render: (row) => (
          <div className="text-center">
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-destructive"
              onClick={() => removeTask(row.id)}
              aria-label={tEd("removeStep")}
            >
              <X className="size-3.5" />
            </Button>
          </div>
        ),
      },
    ],
    [tEd, unit, currencySymbol, updateTask, removeTask],
  );

  const handleAddTask = useCallback(() => {
    const letter = String.fromCharCode(65 + (tasks.length % 26));
    addTask(`Task ${letter}`, 1);
  }, [tasks.length, addTask]);

  return (
    <AppCard title={tEd("timeAndCostSheet")} titleClassName="whitespace-nowrap">
      <div className="flex flex-col gap-3">
        {tasks.length === 0 ? (
          <div className="text-sm text-muted-foreground py-2 italic text-center">
            {tEd("noTasksYet")}
          </div>
        ) : (
          <DataTable
            data={taskRows}
            columns={columns}
            searchPlaceholder={tEd("searchTasks")}
            searchKeys={["name"]}
          />
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
