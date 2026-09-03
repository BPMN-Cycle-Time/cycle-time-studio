"use client";

import { useState, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Plus, ArrowDown, Workflow, ChevronDown } from "lucide-react";
import { BlockType, type Block } from "@/types";
import { useEditorStore, SelectionKind } from "@/store/useEditorStore";
import { BlockCard } from "./block-card";
import {
  Button,
  AppSelect,
  type SelectOption,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui";
import { BLOCK_TYPES, TYPE_META } from "@/constants";
import { cn } from "@/utils";

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
        <h2 className="text-xs uppercase tracking-wide text-muted-foreground mb-3 font-semibold">
          {tEd("processFlow")}
        </h2>
      )}

      {blocks.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center border border-dashed rounded-lg bg-background/50">
          <Workflow className="size-7 text-muted-foreground/30" />
          <p className="text-xs text-muted-foreground">
            {nested ? tEd("noStepsYet") : tEd("addStepNotice")}
          </p>
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
              <BlockCard block={b} index={i} unit={unit} />
            </div>
          ))}
        </div>
      )}

      {nested ? (
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <AppSelect
            value={nestedNewType}
            onValueChange={setNestedNewType}
            options={blockTypeOptions}
          />

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
        <div className="mt-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="w-full">
                <Plus className="size-3.5" />
                {tEd("addTask")}
                <ChevronDown className="size-3.5 ml-auto opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuLabel>{tEd("processFlow")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {BLOCK_TYPES.map((t) => {
                const typeMeta = TYPE_META[t.value];
                const Icon = t.icon;
                return (
                  <DropdownMenuItem
                    key={t.value}
                    onClick={() => handleAddBlock(t.value)}
                    className="gap-2.5"
                  >
                    <div className={cn("size-2 rounded-full shrink-0", typeMeta.dot)} />
                    <Icon className="size-3.5 text-muted-foreground" />
                    <span>{tTypes(t.value)}</span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </section>
  );
}
