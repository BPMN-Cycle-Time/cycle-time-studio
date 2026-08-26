"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { BlockType, BlockMode, type Block } from "@/types";
import { useEditorStore } from "@/store/useEditorStore";
import {
  Input,
  Button,
  Badge,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui";
import { BLOCK_TYPES } from "@/constants";

interface BlockHeaderProps {
  block: Block;
  index: number;
}

export function BlockHeader({ block, index }: BlockHeaderProps) {
  const tTypes = useTranslations("common.blockTypes");
  const tEd = useTranslations("editor");
  const { updateBlock, removeBlock } = useEditorStore();

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
    <div className="flex items-center gap-2.5 px-6 flex-wrap">
      <Badge
        variant="secondary"
        className="font-mono rounded-full size-6 justify-center p-0 shrink-0"
      >
        {index + 1}
      </Badge>

      <Input
        className="flex-1 min-w-[140px] font-semibold border-transparent hover:border-input focus-visible:border-input shadow-none px-2 h-8"
        value={block.label}
        onChange={(e) => updateBlock(block.id, { label: e.target.value })}
        placeholder={tEd("blockNamePlaceholder")}
      />

      <Select value={block.type} onValueChange={(val) => handleTypeChange(val as BlockType)}>
        <SelectTrigger size="sm" className="h-8 text-xs font-medium shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {BLOCK_TYPES.map((bt) => (
            <SelectItem key={bt.value} value={bt.value} className="text-xs">
              {tTypes(bt.value)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:text-destructive size-7 shrink-0"
        onClick={() => removeBlock(block.id)}
        aria-label={tEd("removeStep")}
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}
