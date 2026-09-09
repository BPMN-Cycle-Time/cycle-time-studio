"use client";

import { memo, useMemo } from "react";
import { Plus, ChevronDown } from "lucide-react";
import { Button, AppDropdown, type AppDropdownItem } from "@/components/ui";
import { BLOCK_TYPES, TYPE_META } from "@/constants";
import { BlockType } from "@/types";
import { useEditorStore } from "@/store/useEditorStore";
import { cn } from "@/utils";
import { useTranslations } from "next-intl";

export interface AddBlockDropdownProps {
  /** Optional callback when a block type is selected. Defaults to store's addBlock(type). */
  onAddBlock?: (type: BlockType) => void;
  /** Button style variant (default: "default") */
  buttonVariant?: "default" | "outline" | "secondary" | "ghost";
  /** Button size variant (default: "sm") */
  buttonSize?: "default" | "sm" | "lg" | "icon";
  /** Custom class name for trigger button */
  buttonClassName?: string;
  /** Dropdown menu alignment (default: "start") */
  align?: "start" | "center" | "end";
  /** Custom button label (default: tEd("addTask")) */
  label?: React.ReactNode;
  /** Whether the trigger button should take full width (default: false) */
  fullWidth?: boolean;
}

export const AddBlockDropdown = memo(function AddBlockDropdown({
  onAddBlock,
  buttonVariant = "default",
  buttonSize = "sm",
  buttonClassName,
  align = "start",
  label,
  fullWidth = false,
}: AddBlockDropdownProps) {
  const tEd = useTranslations("editor");
  const tTypes = useTranslations("common.blockTypes");
  const storeAddBlock = useEditorStore((s) => s.addBlock);

  const items: AppDropdownItem[] = useMemo(
    () =>
      BLOCK_TYPES.map((t) => {
        const typeMeta = TYPE_META[t.value];
        return {
          id: t.value,
          label: tTypes(t.value),
          icon: t.icon,
          dot: typeMeta.dot,
          onClick: () => {
            if (onAddBlock) {
              onAddBlock(t.value);
            } else {
              storeAddBlock(t.value);
            }
          },
        };
      }),
    [tTypes, onAddBlock, storeAddBlock],
  );

  return (
    <AppDropdown
      align={align}
      title={tEd("processFlow")}
      items={items}
      trigger={
        <Button
          variant={buttonVariant}
          size={buttonSize}
          className={cn(
            "h-8 text-xs gap-1.5 font-medium shadow-xs",
            fullWidth && "w-full justify-between",
            buttonClassName,
          )}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <Plus className="size-3.5 shrink-0" />
            <span className="truncate">{label ?? tEd("addTask")}</span>
          </div>
          <ChevronDown
            className={cn("size-3 opacity-60 shrink-0", fullWidth ? "ml-auto" : "ml-0.5")}
          />
        </Button>
      }
    />
  );
});
