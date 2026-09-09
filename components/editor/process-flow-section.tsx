"use client";

import { useState, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Plus, ArrowDown, Workflow, Maximize2 } from "lucide-react";
import { BlockType, type Block } from "@/types";
import { useEditorStore, SelectionKind } from "@/store/useEditorStore";
import { BlockCard } from "./block-card";
import { FlowCanvasDialog } from "./flow-canvas";
import { AddBlockDropdown } from "./add-block-dropdown";
import { Button, AppSelect, type SelectOption } from "@/components/ui";
import { BLOCK_TYPES } from "@/constants";

interface ProcessFlowSectionProps {
  blocks: Block[];
  unit: string;
  nested?: boolean;
  parentId?: string;
  parentKind?: SelectionKind;
}

export function ProcessFlowSection({
  blocks,
  unit,
  nested = false,
  parentId,
  parentKind,
}: ProcessFlowSectionProps) {
  const tEd = useTranslations("editor");
  const tTypes = useTranslations("common.blockTypes");
  const addBlock = useEditorStore((s) => s.addBlock);
  const addNestedBlock = useEditorStore((s) => s.addNestedBlock);
  const [nestedNewType, setNestedNewType] = useState<BlockType>(BlockType.SEQ);
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);

  const blockTypeOptions: SelectOption<BlockType>[] = useMemo(
    () =>
      BLOCK_TYPES.map((t) => ({
        value: t.value,
        label: tTypes(t.value),
        icon: t.icon,
      })),
    [tTypes],
  );

  const handleAddBlock = useCallback(
    (type: BlockType) => {
      if (nested && parentId && parentKind) {
        addNestedBlock(parentId, parentKind, type);
      } else {
        addBlock(type);
      }
    },
    [nested, parentId, parentKind, addNestedBlock, addBlock],
  );

  return (
    <section className={nested ? "w-full" : ""}>
      {!nested && (
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
            {tEd("processFlow")}
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCanvasOpen(true)}
            className="h-7 px-2.5 text-xs gap-1.5 font-medium hover:text-primary transition-all shadow-2xs"
            title={tEd("visualCanvasDesc")}
          >
            <Maximize2 className="size-3 text-purple-500" />
            <span>{tEd("visualCanvas")}</span>
          </Button>
        </div>
      )}

      {blocks.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center border border-dashed rounded-lg bg-background/50">
          <Workflow className="size-7 text-muted-foreground/30" />
          <p className="text-xs text-muted-foreground">
            {nested ? tEd("noStepsYet") : tEd("addStepNotice")}
          </p>
          {!nested && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCanvasOpen(true)}
              className="h-7 text-xs gap-1.5 mt-1"
            >
              <Maximize2 className="size-3 text-purple-500" />
              {tEd("visualCanvas")}
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-0">
          {blocks.map((b, i) => (
            <div key={b.id}>
              {i > 0 && (
                <div className="text-center py-1 select-none">
                  <ArrowDown className="size-3 text-muted-foreground mx-auto" />
                </div>
              )}
              <BlockCard block={b} index={i} unit={unit} nested={nested} />
            </div>
          ))}
        </div>
      )}

      {nested ? (
        <div className="flex items-center gap-1.5 mt-2">
          <AppSelect
            value={nestedNewType}
            onValueChange={setNestedNewType}
            options={blockTypeOptions}
            triggerClassName="h-7 text-xs flex-1 min-w-[100px]"
          />

          <Button
            variant="secondary"
            size="sm"
            className="h-7 text-xs px-2.5 shrink-0"
            onClick={() => handleAddBlock(nestedNewType)}
          >
            <Plus className="size-3" /> {tEd("addTask")}
          </Button>
        </div>
      ) : (
        <div className="mt-3">
          <AddBlockDropdown
            onAddBlock={handleAddBlock}
            buttonVariant="outline"
            fullWidth
            align="start"
          />
        </div>
      )}

      {/* Fullscreen Visual Flow Studio Canvas Dialog */}
      {!nested && <FlowCanvasDialog open={isCanvasOpen} onOpenChange={setIsCanvasOpen} />}
    </section>
  );
}
