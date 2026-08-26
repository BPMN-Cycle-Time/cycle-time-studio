"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Trash2, Check, ArrowUp, ArrowDown, GitBranch, Layers } from "lucide-react";

import { BlockType, BlockMode } from "@/types";
import { useEditorStore, SelectionKind } from "@/store/useEditorStore";
import { findBlockInTree, findBranchInTree } from "@/services/graph";
import {
  Button,
  Input,
  Badge,
  Card,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui";
import { BLOCK_TYPES } from "@/constants";

const CUSTOM_VALUE = "__custom__";

export function DiagramInspector() {
  const tTypes = useTranslations("common.blockTypes");
  const tBtn = useTranslations("common.buttons");
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

  const [insertBeforeType, setInsertBeforeType] = useState<BlockType>(BlockType.SEQ);
  const [insertAfterType, setInsertAfterType] = useState<BlockType>(BlockType.SEQ);

  if (!project) return null;

  const blocks = project.blocks;
  const tasks = project.tasks;

  if (!selectedId || !selectedKind) {
    return (
      <div className="mt-3 p-3.5 border border-dashed rounded-lg bg-muted/30 text-xs text-muted-foreground flex items-center justify-between gap-2">
        <span>{tDia("inspector.tip")}</span>
      </div>
    );
  }

  // Branch selected
  if (selectedKind === SelectionKind.BRANCH) {
    const hit = findBranchInTree(blocks, selectedId);
    if (!hit) return null;
    const { branch, parentBlock } = hit;
    const isXor = parentBlock.type === BlockType.XOR;
    const isComposite = branch.mode === BlockMode.COMPOSITE;

    return (
      <Card className="mt-3 p-4 bg-card border-primary/50 shadow-md transition-all">
        <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-[10px] uppercase font-mono bg-primary/10 text-primary border-primary/30"
            >
              {isXor ? tTypes("xorBranch") : tTypes("andBranch")}
            </Badge>
            <span className="font-semibold text-sm">{branch.label || "Branch"}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => select(null, null)}
          >
            <Check className="size-3.5 mr-1" /> {tBtn("done")}
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-3">
          {/* Branch Label */}
          <div>
            <label className="text-[10px] font-medium uppercase text-muted-foreground mb-1 block">
              {tDia("inspector.branchName")}
            </label>
            <Input
              className="h-8 text-xs font-medium"
              value={branch.label}
              onChange={(e) => updateBranch(parentBlock.id, branch.id, { label: e.target.value })}
            />
          </div>

          {/* Probability (XOR only) */}
          {isXor && (
            <div>
              <label className="text-[10px] font-medium uppercase text-muted-foreground mb-1 block">
                {tDia("inspector.probability")}
              </label>
              <Input
                type="number"
                step="any"
                min={0}
                max={100}
                className="h-8 text-xs font-mono"
                value={branch.p ?? 0}
                onChange={(e) =>
                  updateBranch(parentBlock.id, branch.id, { p: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
          )}

          {/* Task / Duration */}
          {!isComposite && (
            <>
              <div>
                <label className="text-[10px] font-medium uppercase text-muted-foreground mb-1 block">
                  {tDia("inspector.taskFromTimesheet")}
                </label>
                <Select
                  value={branch.taskId || CUSTOM_VALUE}
                  onValueChange={(val) => {
                    const taskId = val === CUSTOM_VALUE ? null : val;
                    const foundTask = tasks.find((t) => t.id === taskId);
                    updateBranch(parentBlock.id, branch.id, {
                      taskId,
                      label: foundTask ? foundTask.name : branch.label,
                    });
                  }}
                >
                  <SelectTrigger size="sm" className="h-8 text-xs w-full">
                    <SelectValue placeholder={tDia("inspector.customTimeOption")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={CUSTOM_VALUE} className="text-xs">
                      {tDia("inspector.customTimeOption")}
                    </SelectItem>
                    {tasks.map((t) => (
                      <SelectItem key={t.id} value={t.id} className="text-xs">
                        {t.name} ({t.time} {project.unit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {!branch.taskId && (
                <div>
                  <label className="text-[10px] font-medium uppercase text-muted-foreground mb-1 block">
                    {tDia("inspector.duration", { unit: project.unit })}
                  </label>
                  <Input
                    type="number"
                    step="any"
                    min={0}
                    className="h-8 text-xs font-mono"
                    value={branch.t ?? 1}
                    onChange={(e) =>
                      updateBranch(parentBlock.id, branch.id, {
                        t: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t text-xs">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => toggleBranchMode(parentBlock.id, branch.id)}
          >
            <Layers className="size-3.5 mr-1" />
            {isComposite ? tBtn("collapseSubProcess") : tBtn("expandSubProcess")}
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => addBranch(parentBlock.id)}
          >
            <GitBranch className="size-3.5 mr-1" /> {tBtn("addBranch")}
          </Button>

          <Button
            variant="destructive"
            size="sm"
            className="h-8 text-xs ml-auto"
            disabled={(parentBlock.branches?.length ?? 0) <= 1}
            onClick={() => {
              removeBranch(parentBlock.id, branch.id);
              select(null, null);
            }}
          >
            <Trash2 className="size-3.5 mr-1" /> {tBtn("deleteBranch")}
          </Button>
        </div>
      </Card>
    );
  }

  // Block selected
  const found = findBlockInTree(blocks, selectedId);
  if (!found) return null;
  const { block: b, index } = found;
  const isComposite = b.mode === BlockMode.COMPOSITE;

  return (
    <Card className="mt-3 p-4 bg-card border-primary/50 shadow-md transition-all">
      <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="text-[10px] uppercase font-mono bg-primary/10 text-primary border-primary/30"
          >
            {tTypes(b.type)}
          </Badge>
          <span className="font-semibold text-sm">{b.label || "Block"}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => select(null, null)}
        >
          <Check className="size-3.5 mr-1" /> {tBtn("done")}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-3">
        {/* Name / Label */}
        <div>
          <label className="text-[10px] font-medium uppercase text-muted-foreground mb-1 block">
            {tDia("inspector.stepName")}
          </label>
          <Input
            className="h-8 text-xs font-semibold"
            value={b.label}
            onChange={(e) => updateBlock(b.id, { label: e.target.value })}
          />
        </div>

        {/* Type */}
        <div>
          <label className="text-[10px] font-medium uppercase text-muted-foreground mb-1 block">
            {tDia("inspector.stepType")}
          </label>
          <Select
            value={b.type}
            onValueChange={(val) => updateBlock(b.id, { type: val as BlockType })}
          >
            <SelectTrigger size="sm" className="h-8 text-xs font-medium w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BLOCK_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value} className="text-xs">
                  {tTypes(t.value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sequence Block details */}
        {b.type === BlockType.SEQ && !isComposite && (
          <>
            <div>
              <label className="text-[10px] font-medium uppercase text-muted-foreground mb-1 block">
                {tDia("inspector.taskFromTimesheet")}
              </label>
              <Select
                value={b.taskId || CUSTOM_VALUE}
                onValueChange={(val) => {
                  const taskId = val === CUSTOM_VALUE ? null : val;
                  const foundTask = tasks.find((t) => t.id === taskId);
                  updateBlock(b.id, {
                    taskId,
                    label: foundTask ? foundTask.name : b.label,
                  });
                }}
              >
                <SelectTrigger size="sm" className="h-8 text-xs w-full">
                  <SelectValue placeholder={tDia("inspector.customTimeOption")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CUSTOM_VALUE} className="text-xs">
                    {tDia("inspector.customTimeOption")}
                  </SelectItem>
                  {tasks.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-xs">
                      {t.name} ({t.time} {project.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!b.taskId && (
              <div>
                <label className="text-[10px] font-medium uppercase text-muted-foreground mb-1 block">
                  {tDia("inspector.duration", { unit: project.unit })}
                </label>
                <Input
                  type="number"
                  step="any"
                  min={0}
                  className="h-8 text-xs font-mono"
                  value={b.time ?? 1}
                  onChange={(e) => updateBlock(b.id, { time: parseFloat(e.target.value) || 0 })}
                />
              </div>
            )}
          </>
        )}

        {/* Rework Loop details */}
        {b.type === BlockType.LOOP && (
          <>
            <div>
              <label className="text-[10px] font-medium uppercase text-muted-foreground mb-1 block">
                {tDia("inspector.reworkProbability")}
              </label>
              <Input
                type="number"
                step="any"
                min={0}
                max={99.9}
                className="h-8 text-xs font-mono"
                value={b.loopP ?? 20}
                onChange={(e) => updateBlock(b.id, { loopP: parseFloat(e.target.value) || 0 })}
              />
            </div>

            {!isComposite && (
              <>
                <div>
                  <label className="text-[10px] font-medium uppercase text-muted-foreground mb-1 block">
                    {tDia("inspector.taskInLoop")}
                  </label>
                  <Select
                    value={b.taskId || CUSTOM_VALUE}
                    onValueChange={(val) => {
                      const taskId = val === CUSTOM_VALUE ? null : val;
                      const foundTask = tasks.find((t) => t.id === taskId);
                      updateBlock(b.id, {
                        taskId,
                        label: foundTask ? foundTask.name : b.label,
                      });
                    }}
                  >
                    <SelectTrigger size="sm" className="h-8 text-xs w-full">
                      <SelectValue placeholder={tDia("inspector.customTimeOption")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={CUSTOM_VALUE} className="text-xs">
                        {tDia("inspector.customTimeOption")}
                      </SelectItem>
                      {tasks.map((t) => (
                        <SelectItem key={t.id} value={t.id} className="text-xs">
                          {t.name} ({t.time} {project.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {!b.taskId && (
                  <div>
                    <label className="text-[10px] font-medium uppercase text-muted-foreground mb-1 block">
                      {tDia("inspector.loopDuration", { unit: project.unit })}
                    </label>
                    <Input
                      type="number"
                      step="any"
                      min={0}
                      className="h-8 text-xs font-mono"
                      value={b.loopTime ?? 1}
                      onChange={(e) =>
                        updateBlock(b.id, { loopTime: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t text-xs">
        {/* Insert Before */}
        <div className="flex items-center gap-1">
          <select
            className="h-8 rounded-md border border-input bg-background px-2 text-xs font-sans"
            value={insertBeforeType}
            onChange={(e) => setInsertBeforeType(e.target.value as BlockType)}
          >
            {BLOCK_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {tTypes(t.value)}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => addBlock(insertBeforeType, index - 1)}
          >
            <ArrowUp className="size-3.5 mr-1" /> {tBtn("insertBefore")}
          </Button>
        </div>

        {/* Insert After */}
        <div className="flex items-center gap-1">
          <select
            className="h-8 rounded-md border border-input bg-background px-2 text-xs font-sans"
            value={insertAfterType}
            onChange={(e) => setInsertAfterType(e.target.value as BlockType)}
          >
            {BLOCK_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {tTypes(t.value)}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => addBlock(insertAfterType, index)}
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
            onClick={() => addBranch(b.id)}
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
            onClick={() => toggleLoopMode(b.id)}
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
            removeBlock(b.id);
            select(null, null);
          }}
        >
          <Trash2 className="size-3.5 mr-1" /> {tBtn("deleteStep")}
        </Button>
      </div>
    </Card>
  );
}
