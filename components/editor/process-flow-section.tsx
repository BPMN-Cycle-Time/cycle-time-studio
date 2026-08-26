"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { BlockType, type Block } from "@/types";
import { useEditorStore, SelectionKind } from "@/store/useEditorStore";
import { BlockCard } from "./block-card";
import {
  Button,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui";
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
  const { addBlock, addNestedBlock } = useEditorStore();
  const [nestedNewType, setNestedNewType] = useState<BlockType>(BlockType.SEQ);

  const handleAddBlock = (type: BlockType) => {
    if (nested && parentId && parentKind) {
      addNestedBlock(parentId, parentKind, type);
    } else {
      addBlock(type);
    }
  };

  return (
    <section className={nested ? "w-full" : ""}>
      {!nested && (
        <h2 className="text-xs uppercase tracking-wide text-muted-foreground mb-3 font-semibold">
          {tEd("processFlow")}
        </h2>
      )}

      {blocks.length === 0 ? (
        <div className="text-center py-4 text-xs text-muted-foreground border border-dashed rounded-lg bg-background/50">
          {nested ? tEd("noStepsYet") : tEd("addStepNotice")}
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {blocks.map((b, i) => (
            <div key={b.id}>
              {i > 0 && (
                <div className="text-center text-muted-foreground/40 font-mono text-xs py-0.5 select-none">
                  ↓
                </div>
              )}
              <BlockCard block={b} index={i} unit={unit} />
            </div>
          ))}
        </div>
      )}

      {nested ? (
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <Select value={nestedNewType} onValueChange={(val) => setNestedNewType(val as BlockType)}>
            <SelectTrigger size="sm" className="h-8 text-xs font-medium shrink-0">
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

          <Button
            variant="secondary"
            size="sm"
            className="h-8 text-xs"
            onClick={() => handleAddBlock(nestedNewType)}
          >
            <Plus className="size-3.5" /> {tEd("addTask")}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 mt-3">
          {BLOCK_TYPES.map((t) => (
            <Button
              key={t.value}
              variant="outline"
              size="sm"
              onClick={() => handleAddBlock(t.value)}
            >
              <t.icon /> {tTypes(t.value)}
            </Button>
          ))}
        </div>
      )}
    </section>
  );
}
