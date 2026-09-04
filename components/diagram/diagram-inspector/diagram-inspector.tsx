"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { BlockType } from "@/types";
import { useEditorStore, SelectionKind } from "@/store/useEditorStore";
import { findBlockInTree, findBranchInTree } from "@/services/graph";
import { type SelectOption } from "@/components/ui";
import { BLOCK_TYPES } from "@/constants";
import { BlockInspector } from "./block-inspector";
import { BranchInspector } from "./branch-inspector";
import { CUSTOM_VALUE } from "./inspector-task-fields";

export function DiagramInspector() {
  const tTypes = useTranslations("common.blockTypes");
  const tDia = useTranslations("diagram");
  const {
    project,
    selectedId,
    selectedKind,
    select,
    updateBlock,
    removeBlock,
    addBlock,
    addBranch,
    updateBranch,
    removeBranch,
    toggleBranchMode,
    toggleLoopMode,
  } = useEditorStore();

  const blockTypeOptions: SelectOption<BlockType>[] = useMemo(
    () =>
      BLOCK_TYPES.map((t) => ({
        value: t.value,
        label: tTypes(t.value),
        icon: t.icon,
      })),
    [tTypes],
  );

  const tasks = useMemo(() => project?.tasks ?? [], [project?.tasks]);
  const unit = project?.unit ?? "";

  const taskOptions: SelectOption<string>[] = useMemo(
    () => [
      { value: CUSTOM_VALUE, label: tDia("inspector.customTimeOption") },
      ...tasks.map((t) => ({
        value: t.id,
        label: `${t.name} (${t.time} ${unit})`,
      })),
    ],
    [tasks, unit, tDia],
  );

  if (!project) return null;

  const blocks = project.blocks;

  if (!selectedId || !selectedKind) {
    return (
      <div className="p-3.5 border border-dashed rounded-lg bg-muted/30 text-xs text-muted-foreground flex items-center justify-between gap-2">
        <span>{tDia("inspector.tip")}</span>
      </div>
    );
  }

  // Branch selected
  if (selectedKind === SelectionKind.BRANCH) {
    const hit = findBranchInTree(blocks, selectedId);
    if (!hit) return null;

    return (
      <div className="shrink-0">
        <BranchInspector
          branch={hit.branch}
          parentBlock={hit.parentBlock}
          tasks={tasks}
          unit={unit}
          taskOptions={taskOptions}
          onClose={() => select(null, null)}
          onUpdateBranch={updateBranch}
          onRemoveBranch={removeBranch}
          onToggleBranchMode={toggleBranchMode}
          onAddBranch={addBranch}
        />
      </div>
    );
  }

  // Block selected
  const found = findBlockInTree(blocks, selectedId);
  if (!found) return null;

  return (
    <div className="shrink-0">
      <BlockInspector
        block={found.block}
        index={found.index}
        tasks={tasks}
        unit={unit}
        taskOptions={taskOptions}
        blockTypeOptions={blockTypeOptions}
        onClose={() => select(null, null)}
        onUpdateBlock={updateBlock}
        onRemoveBlock={removeBlock}
        onAddBlock={addBlock}
        onAddBranch={addBranch}
        onToggleLoopMode={toggleLoopMode}
      />
    </div>
  );
}
