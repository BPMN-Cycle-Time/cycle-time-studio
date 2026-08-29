"use client";

import { GitBranch, Layers, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { AppInput, Button, Card, type SelectOption } from "@/components/ui";
import { BlockMode, BlockType, type Branch, type Block, type Task } from "@/types";
import { InspectorHeader } from "./inspector-header";
import { InspectorTaskFields } from "./inspector-task-fields";

interface BranchInspectorProps {
  branch: Branch;
  parentBlock: Block;
  tasks: Task[];
  unit: string;
  taskOptions: SelectOption<string>[];
  onClose: () => void;
  onUpdateBranch: (parentBlockId: string, branchId: string, updates: Partial<Branch>) => void;
  onRemoveBranch: (parentBlockId: string, branchId: string) => void;
  onToggleBranchMode: (parentBlockId: string, branchId: string) => void;
  onAddBranch: (parentBlockId: string) => void;
}

export function BranchInspector({
  branch,
  parentBlock,
  tasks,
  unit,
  taskOptions,
  onClose,
  onUpdateBranch,
  onRemoveBranch,
  onToggleBranchMode,
  onAddBranch,
}: BranchInspectorProps) {
  const tTypes = useTranslations("common.blockTypes");
  const tBtn = useTranslations("common.buttons");
  const tDia = useTranslations("diagram");

  const isXor = parentBlock.type === BlockType.XOR;
  const isComposite = branch.mode === BlockMode.COMPOSITE;

  const handleTaskChange = (taskId: string | null) => {
    const foundTask = tasks.find((t) => t.id === taskId);
    onUpdateBranch(parentBlock.id, branch.id, {
      taskId,
      label: foundTask ? foundTask.name : branch.label,
    });
  };

  return (
    <Card className="p-4 gap-4 transition-all">
      <InspectorHeader
        badgeLabel={isXor ? tTypes("xorBranch") : tTypes("andBranch")}
        title={branch.label || "Branch"}
        onClose={onClose}
        doneText={tBtn("done")}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {/* Branch Label */}
        <AppInput
          label={tDia("inspector.branchName")}
          labelVariant="uppercase"
          inputClassName="font-medium"
          value={branch.label}
          onChange={(e) => onUpdateBranch(parentBlock.id, branch.id, { label: e.target.value })}
        />

        {/* Probability (XOR only) */}
        {isXor && (
          <AppInput
            label={tDia("inspector.probability")}
            labelVariant="uppercase"
            type="number"
            step="any"
            min={0}
            max={100}
            inputClassName="font-mono"
            value={branch.p ?? 0}
            onChange={(e) =>
              onUpdateBranch(parentBlock.id, branch.id, { p: parseFloat(e.target.value) || 0 })
            }
          />
        )}

        {/* Task / Duration */}
        {!isComposite && (
          <InspectorTaskFields
            taskId={branch.taskId}
            duration={branch.t}
            durationLabel={tDia("inspector.duration", { unit })}
            taskLabel={tDia("inspector.taskFromTimesheet")}
            taskOptions={taskOptions}
            customOptionPlaceholder={tDia("inspector.customTimeOption")}
            onTaskChange={handleTaskChange}
            onDurationChange={(t) => onUpdateBranch(parentBlock.id, branch.id, { t })}
          />
        )}
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t text-xs">
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={() => onToggleBranchMode(parentBlock.id, branch.id)}
        >
          <Layers className="size-3.5 mr-1" />
          {isComposite ? tBtn("collapseSubProcess") : tBtn("expandSubProcess")}
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={() => onAddBranch(parentBlock.id)}
        >
          <GitBranch className="size-3.5 mr-1" /> {tBtn("addBranch")}
        </Button>

        <Button
          variant="destructive"
          size="sm"
          className="h-8 text-xs ml-auto"
          disabled={(parentBlock.branches?.length ?? 0) <= 1}
          onClick={() => {
            onRemoveBranch(parentBlock.id, branch.id);
            onClose();
          }}
        >
          <Trash2 className="size-3.5 mr-1" /> {tBtn("deleteBranch")}
        </Button>
      </div>
    </Card>
  );
}
