"use client";

import { ArrowDown, ArrowUp, GitBranch, Layers, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { AppInput, AppSelect, Button, Card, type SelectOption } from "@/components/ui";
import { BlockMode, BlockType, type Block, type Task } from "@/types";
import { InspectorHeader } from "./inspector-header";
import { InspectorTaskFields } from "./inspector-task-fields";

interface BlockInspectorProps {
  block: Block;
  index: number;
  tasks: Task[];
  unit: string;
  taskOptions: SelectOption<string>[];
  blockTypeOptions: SelectOption<BlockType>[];
  onClose: () => void;
  onUpdateBlock: (blockId: string, updates: Partial<Block>) => void;
  onRemoveBlock: (blockId: string) => void;
  onAddBlock: (type: BlockType, index?: number) => void;
  onAddBranch: (blockId: string) => void;
  onToggleLoopMode: (blockId: string) => void;
}

export function BlockInspector({
  block: b,
  index,
  tasks,
  unit,
  taskOptions,
  blockTypeOptions,
  onClose,
  onUpdateBlock,
  onRemoveBlock,
  onAddBlock,
  onAddBranch,
  onToggleLoopMode,
}: BlockInspectorProps) {
  const tTypes = useTranslations("common.blockTypes");
  const tBtn = useTranslations("common.buttons");
  const tDia = useTranslations("diagram");

  const [insertBeforeType, setInsertBeforeType] = useState<BlockType>(BlockType.SEQ);
  const [insertAfterType, setInsertAfterType] = useState<BlockType>(BlockType.SEQ);

  const isComposite = b.mode === BlockMode.COMPOSITE;

  const handleTaskChange = (taskId: string | null) => {
    const foundTask = tasks.find((t) => t.id === taskId);
    onUpdateBlock(b.id, {
      taskId,
      label: foundTask ? foundTask.name : b.label,
    });
  };

  return (
    <Card className="p-4 gap-4 transition-all">
      <InspectorHeader
        badgeLabel={tTypes(b.type)}
        title={b.label || "Block"}
        onClose={onClose}
        doneText={tBtn("done")}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {/* Name / Label */}
        <AppInput
          label={tDia("inspector.stepName")}
          labelVariant="uppercase"
          inputClassName="font-semibold"
          value={b.label}
          onChange={(e) => onUpdateBlock(b.id, { label: e.target.value })}
        />

        {/* Type */}
        <AppSelect
          label={tDia("inspector.stepType")}
          labelVariant="uppercase"
          value={b.type}
          onValueChange={(val) => onUpdateBlock(b.id, { type: val as BlockType })}
          options={blockTypeOptions}
          triggerClassName="w-full"
        />

        {/* Sequence Block details */}
        {b.type === BlockType.SEQ && !isComposite && (
          <InspectorTaskFields
            taskId={b.taskId}
            duration={b.time}
            durationLabel={tDia("inspector.duration", { unit })}
            taskLabel={tDia("inspector.taskFromTimesheet")}
            taskOptions={taskOptions}
            customOptionPlaceholder={tDia("inspector.customTimeOption")}
            onTaskChange={handleTaskChange}
            onDurationChange={(time) => onUpdateBlock(b.id, { time })}
          />
        )}

        {/* Rework Loop details */}
        {b.type === BlockType.LOOP && (
          <>
            <AppInput
              label={tDia("inspector.reworkProbability")}
              labelVariant="uppercase"
              type="number"
              step="any"
              min={0}
              max={99.9}
              inputClassName="font-mono"
              value={b.loopP ?? 20}
              onChange={(e) => onUpdateBlock(b.id, { loopP: parseFloat(e.target.value) || 0 })}
            />

            {!isComposite && (
              <InspectorTaskFields
                taskId={b.taskId}
                duration={b.loopTime}
                durationLabel={tDia("inspector.loopDuration", { unit })}
                taskLabel={tDia("inspector.taskInLoop")}
                taskOptions={taskOptions}
                customOptionPlaceholder={tDia("inspector.customTimeOption")}
                onTaskChange={handleTaskChange}
                onDurationChange={(loopTime) => onUpdateBlock(b.id, { loopTime })}
              />
            )}
          </>
        )}
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t text-xs">
        {/* Insert Before */}
        <div className="flex items-center gap-1">
          <AppSelect
            value={insertBeforeType}
            onValueChange={setInsertBeforeType}
            options={blockTypeOptions}
          />
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => onAddBlock(insertBeforeType, index - 1)}
          >
            <ArrowUp className="size-3.5 mr-1" /> {tBtn("insertBefore")}
          </Button>
        </div>

        {/* Insert After */}
        <div className="flex items-center gap-1">
          <AppSelect
            value={insertAfterType}
            onValueChange={setInsertAfterType}
            options={blockTypeOptions}
          />
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => onAddBlock(insertAfterType, index)}
          >
            <ArrowDown className="size-3.5 mr-1" /> {tBtn("insertAfter")}
          </Button>
        </div>

        {/* Gateway specific: Add Branch */}
        {(b.type === BlockType.XOR || b.type === BlockType.AND) && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => onAddBranch(b.id)}
          >
            <GitBranch className="size-3.5 mr-1" /> {tBtn("addBranch")}
          </Button>
        )}

        {/* Loop specific: Toggle Composite */}
        {b.type === BlockType.LOOP && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => onToggleLoopMode(b.id)}
          >
            <Layers className="size-3.5 mr-1" />
            {isComposite ? tBtn("collapseLoopBody") : tBtn("expandLoopBody")}
          </Button>
        )}

        {/* Delete Block */}
        <Button
          variant="destructive"
          size="sm"
          className="h-8 text-xs ml-auto"
          onClick={() => {
            onRemoveBlock(b.id);
            onClose();
          }}
        >
          <Trash2 className="size-3.5 mr-1" /> {tBtn("deleteStep")}
        </Button>
      </div>
    </Card>
  );
}
