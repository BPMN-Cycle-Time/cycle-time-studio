"use client";

import { useTranslations } from "next-intl";
import type { Block, Task } from "@/types";
import { Button, AppCard } from "@/components/ui";

interface BpmnPreviewCardProps {
  preview: { blocks: Block[]; tasks?: Task[]; warnings: string[] };
  unit: string;
  onApply: (blocks: Block[], tasks?: Task[]) => void;
  onDiscard: () => void;
}

export function BpmnPreviewCard({ preview, unit, onApply, onDiscard }: BpmnPreviewCardProps) {
  const tDia = useTranslations("diagram");
  const tBtn = useTranslations("common.buttons");

  return (
    <AppCard variant="subtle" className="mt-4" contentClassName="px-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs uppercase tracking-wide text-muted-foreground">
          {tDia("previewTitle", { count: preview.blocks.length })}
        </h3>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => onApply(preview.blocks, preview.tasks)}
            disabled={preview.blocks.length === 0}
          >
            {tBtn("apply")}
          </Button>
          <Button size="sm" variant="ghost" onClick={onDiscard}>
            {tBtn("discard")}
          </Button>
        </div>
      </div>
      {preview.warnings.length > 0 && (
        <ul className="text-xs text-destructive mb-2 list-disc pl-4">
          {preview.warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      )}
      <ul className="text-sm flex flex-col gap-1">
        {preview.blocks.map((b) => (
          <li key={b.id} className="font-mono text-xs">
            <span className="text-muted-foreground">[{b.type}]</span> {b.label}
            {b.type === "seq" && ` — ${b.time ?? 0} ${unit}`}
            {(b.type === "xor" || b.type === "and") && ` — ${b.branches?.length ?? 0} branch(es)`}
          </li>
        ))}
      </ul>
    </AppCard>
  );
}
