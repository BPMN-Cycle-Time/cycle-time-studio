"use client";

import { X, Plus, Maximize2, Minimize2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { BlockType, BlockMode, type Block, type Task } from "@/types";
import { useEditorStore, SelectionKind } from "@/store/useEditorStore";
import { Button, AppInput, Badge } from "@/components/ui";
import { TaskPicker } from "./task-picker";
import { ProcessFlowSection } from "../process-flow-section";
import { computeBranchTime } from "@/services/engine";

interface BlockBranchesProps {
  block: Block;
  unit: string;
  tasks?: Task[];
}

export function BlockBranches({ block, unit, tasks = [] }: BlockBranchesProps) {
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
    <div className="px-6 flex flex-col gap-3">
      {branches.map((br) => {
        const composite = br.mode === BlockMode.COMPOSITE;
        const selectedTask = tasks.find((t) => t.id === br.taskId);
        const displayTime = selectedTask?.time !== undefined ? selectedTask.time : (br.t ?? 0);
        const branchTime = computeBranchTime(br, tasks);

        return (
          <div key={br.id} className="flex flex-col gap-2 bg-muted/30 rounded-lg p-3 border">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex-1 min-w-[120px]">
                <AppInput
                  wrapperClassName="w-full"
                  inputClassName="h-8 font-semibold bg-transparent border-transparent hover:border-input focus-visible:border-input shadow-none px-2"
                  value={br.label}
                  onChange={(e) => updateBranch(block.id, br.id, { label: e.target.value })}
                  placeholder={tEd("branchNamePlaceholder")}
                />
              </div>

              {isXor && (
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground">
                    {tEd("probLabel")}
                  </span>
                  <AppInput
                    type="number"
                    step="any"
                    min="0"
                    max="100"
                    wrapperClassName="w-20 shrink-0"
                    inputClassName="h-8 font-mono text-xs px-2 pr-5 text-right"
                    value={br.p ?? 0}
                    onChange={(e) =>
                      updateBranch(block.id, br.id, { p: parseFloat(e.target.value) || 0 })
                    }
                    suffix="%"
                  />
                </div>
              )}

              {composite ? (
                <Badge variant="outline" className="font-mono text-xs h-8 px-2.5 shrink-0">
                  Σ = {Math.round(branchTime * 100) / 100} {unit}
                </Badge>
              ) : (
                <div className="flex items-center gap-1.5 shrink-0">
                  <TaskPicker
                    tasks={tasks}
                    selectedTaskId={br.taskId}
                    onChange={(tId) => handleTaskChange(br.id, tId)}
                    className="h-8 text-xs min-w-[120px]"
                  />
                  {selectedTask ? (
                    <AppInput
                      type="number"
                      readOnly
                      wrapperClassName="w-24 shrink-0"
                      inputClassName="h-8 font-mono text-xs bg-muted/50 cursor-not-allowed"
                      value={displayTime}
                      suffix={unit}
                      title={tEd("timeSheetHint")}
                    />
                  ) : (
                    <AppInput
                      type="number"
                      step="any"
                      min="0"
                      wrapperClassName="w-24 shrink-0"
                      inputClassName="h-8 font-mono text-xs"
                      value={br.t ?? 0}
                      onChange={(e) =>
                        updateBranch(block.id, br.id, { t: parseFloat(e.target.value) || 0 })
                      }
                      suffix={unit}
                    />
                  )}
                </div>
              )}

              <div className="flex items-center gap-0.5 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-primary shrink-0"
                  onClick={() => toggleBranchMode(block.id, br.id)}
                  title={composite ? tEd("collapseSubProcess") : tEd("expandSubProcess")}
                >
                  {composite ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => removeBranch(block.id, br.id)}
                  disabled={branches.length <= 1}
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>

            {/* Render nested sub-process if composite mode */}
            {composite && (
              <div className="border border-dashed rounded-md p-2.5 bg-background/60 mt-1">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
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
