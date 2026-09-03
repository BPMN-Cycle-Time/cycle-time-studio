"use client";

import { X, Plus, Maximize2, Minimize2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { BlockType, BlockMode, type Block, type Task } from "@/types";
import { useEditorStore, SelectionKind } from "@/store/useEditorStore";
import { Button, AppInput, Badge } from "@/components/ui";
import { TaskPicker } from "./task-picker";
import { ProcessFlowSection } from "../process-flow-section";
import { computeBranchTime } from "@/services/engine";
import { cn } from "@/utils";

interface BlockBranchesProps {
  block: Block;
  unit: string;
  tasks?: Task[];
  nested?: boolean;
}

export function BlockBranches({ block, unit, tasks = [], nested }: BlockBranchesProps) {
  const tEd = useTranslations("editor");
  const tBtn = useTranslations("common.buttons");
  const { addBranch, updateBranch, removeBranch, toggleBranchMode } = useEditorStore();
  const branches = block.branches ?? [];
  const isXor = block.type === BlockType.XOR;
  const totalProbability = branches.reduce((s, b) => s + (b.p ?? 0), 0);

  const handleTaskChange = (branchId: string, taskId: string | null) => {
    const patch: Partial<(typeof branches)[0]> = { taskId };
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      patch.label = task.name;
    }
    updateBranch(block.id, branchId, patch);
  };

  return (
    <div className={cn("flex flex-col gap-2.5", nested ? "px-3" : "px-4 sm:px-5")}>
      {branches.map((br) => {
        const composite = br.mode === BlockMode.COMPOSITE;
        const selectedTask = tasks.find((t) => t.id === br.taskId);
        const displayTime = selectedTask?.time !== undefined ? selectedTask.time : (br.t ?? 0);
        const branchTime = computeBranchTime(br, tasks);

        return (
          <div key={br.id} className="flex flex-col gap-1.5 bg-muted/30 rounded-lg p-2.5 border">
            <div className="flex flex-wrap items-center justify-between gap-1.5 min-w-0">
              {/* Branch name & probability */}
              <div className="flex items-center gap-1.5 flex-1 min-w-[7rem]">
                <AppInput
                  wrapperClassName="flex-1 min-w-0"
                  inputClassName="h-7 text-xs font-semibold bg-transparent border-transparent hover:border-input focus-visible:border-input shadow-none px-1.5"
                  value={br.label}
                  onChange={(e) => updateBranch(block.id, br.id, { label: e.target.value })}
                  placeholder={tEd("branchNamePlaceholder")}
                />

                {/* XOR Probability */}
                {isXor && (
                  <AppInput
                    type="number"
                    step="any"
                    min="0"
                    max="100"
                    wrapperClassName="w-[4.5rem] shrink-0"
                    inputClassName="h-7 font-mono text-xs px-1.5 text-right"
                    value={br.p ?? 0}
                    onChange={(e) =>
                      updateBranch(block.id, br.id, { p: parseFloat(e.target.value) || 0 })
                    }
                    suffix="%"
                  />
                )}
              </div>

              {/* Task/Time controls & actions */}
              {composite ? (
                <div className="flex items-center gap-1 shrink-0 ml-auto">
                  <Badge variant="outline" className="font-mono text-[11px] h-7 px-2 shrink-0">
                    Σ = {Math.round(branchTime * 100) / 100} {unit}
                  </Badge>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-primary shrink-0"
                      onClick={() => toggleBranchMode(block.id, br.id)}
                      title={tEd("collapseSubProcess")}
                    >
                      <Minimize2 className="size-3.5" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => removeBranch(block.id, br.id)}
                      disabled={branches.length <= 1}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                  <TaskPicker
                    tasks={tasks}
                    selectedTaskId={br.taskId}
                    onChange={(tId) => handleTaskChange(br.id, tId)}
                    className="h-7 text-xs w-[6.5rem] shrink-0"
                  />
                  {selectedTask ? (
                    <AppInput
                      type="number"
                      readOnly
                      wrapperClassName="w-20 shrink-0"
                      inputClassName="h-7 font-mono text-xs bg-muted/50 cursor-not-allowed"
                      value={displayTime}
                      suffix={unit}
                      title={tEd("timeSheetHint")}
                    />
                  ) : (
                    <AppInput
                      type="number"
                      step="any"
                      min="0"
                      wrapperClassName="w-20 shrink-0"
                      inputClassName="h-7 font-mono text-xs"
                      value={br.t ?? 0}
                      onChange={(e) =>
                        updateBranch(block.id, br.id, { t: parseFloat(e.target.value) || 0 })
                      }
                      suffix={unit}
                    />
                  )}

                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-primary shrink-0"
                      onClick={() => toggleBranchMode(block.id, br.id)}
                      title={tEd("expandSubProcess")}
                    >
                      <Maximize2 className="size-3.5" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => removeBranch(block.id, br.id)}
                      disabled={branches.length <= 1}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Render nested sub-process if composite mode */}
            {composite && (
              <div className="border border-dashed rounded-md p-2 bg-background/60 mt-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 px-0.5 truncate">
                  {tEd("subProcessFor", { name: br.label })}
                </p>
                <ProcessFlowSection
                  blocks={br.subBlocks ?? []}
                  unit={unit}
                  nested
                  parentId={br.id}
                  parentKind={SelectionKind.BRANCH}
                />
              </div>
            )}
          </div>
        );
      })}

      <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
        <Button
          variant="secondary"
          size="sm"
          className="self-start text-xs"
          onClick={() => addBranch(block.id)}
        >
          <Plus className="size-3.5" /> {tBtn("addBranch")}
        </Button>

        {isXor && Math.abs(totalProbability - 100) > 0.5 && (
          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
            {tEd("probabilityWarning", { sum: Math.round(totalProbability * 100) / 100 })}
          </p>
        )}
      </div>
    </div>
  );
}
