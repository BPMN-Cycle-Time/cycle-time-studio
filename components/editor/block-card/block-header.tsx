"use client";

import { useMemo } from "react";
import { X, ListOrdered } from "lucide-react";
import { useTranslations } from "next-intl";
import { BlockType, BlockMode, type Block } from "@/types";
import { useEditorStore } from "@/store/useEditorStore";
import { Input, Button, AppSelect, type SelectOption } from "@/components/ui";
import { cn } from "@/utils";
import { BLOCK_TYPES, TYPE_META } from "@/constants";

interface BlockHeaderProps {
  block: Block;
  index: number;
  nested?: boolean;
}

export function BlockHeader({ block, index, nested }: BlockHeaderProps) {
  const tTypes = useTranslations("common.blockTypes");
  const tEd = useTranslations("editor");
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const removeBlock = useEditorStore((s) => s.removeBlock);

  const meta = TYPE_META[block.type as BlockType];
  const typeConfig = BLOCK_TYPES.find((bt) => bt.value === block.type);
  const TypeIcon = typeConfig?.icon ?? ListOrdered;

  const blockTypeOptions: SelectOption<BlockType>[] = useMemo(
    () =>
      BLOCK_TYPES.map((bt) => ({
        value: bt.value,
        label: tTypes(bt.value),
        icon: bt.icon,
      })),
    [tTypes],
  );

  const handleTypeChange = (newType: BlockType) => {
    if (newType === block.type) return;
    const patch: Partial<Block> = { type: newType };
    if (newType === BlockType.SEQ) {
      patch.time = block.time ?? 1;
    } else if (newType === BlockType.LOOP) {
      patch.loopP = block.loopP ?? 20;
      patch.loopTime = block.loopTime ?? 1;
    } else if (newType === BlockType.XOR || newType === BlockType.AND) {
      if (!block.branches || block.branches.length === 0) {
        patch.branches = [
          {
            id: crypto.randomUUID(),
            label: "Branch A",
            p: newType === BlockType.XOR ? 50 : undefined,
            t: 1,
            mode: BlockMode.SIMPLE,
          },
          {
            id: crypto.randomUUID(),
            label: "Branch B",
            p: newType === BlockType.XOR ? 50 : undefined,
            t: 1,
            mode: BlockMode.SIMPLE,
          },
        ];
      }
    }
    updateBlock(block.id, patch);
  };

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 flex-wrap",
        nested ? "px-3" : "px-4 sm:px-5",
      )}
    >
      {/* Left: Type Icon Tag + Step Index + Name input */}
      <div className="flex items-center gap-1.5 flex-1 min-w-[100px]">
        <div
          className={cn(
            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-mono font-bold border shrink-0 transition-colors shadow-2xs",
            meta.tagBg,
          )}
          title={tTypes(block.type)}
        >
          <TypeIcon className="size-3 shrink-0" />
          <span>{index + 1}</span>
        </div>

        <Input
          className="flex-1 min-w-0 font-semibold border-transparent hover:border-input focus-visible:border-input shadow-none px-1.5 h-7 text-xs sm:text-sm"
          value={block.label}
          onChange={(e) => updateBlock(block.id, { label: e.target.value })}
          placeholder={tEd("blockNamePlaceholder")}
        />
      </div>

      {/* Right: Type select styled as icon tag + Delete button */}
      <div className="flex items-center gap-1 shrink-0 ml-auto">
        <AppSelect
          value={block.type}
          onValueChange={handleTypeChange}
          options={blockTypeOptions}
          triggerClassName={cn(
            "font-medium h-7 text-xs shrink-0 max-w-[150px] border transition-colors shadow-2xs",
            meta.tagBg,
          )}
        />

        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-destructive size-7 shrink-0"
          onClick={() => removeBlock(block.id)}
          aria-label={tEd("removeStep")}
        >
          <X className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
