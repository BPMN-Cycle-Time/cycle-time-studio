"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Layers, AlertTriangle } from "lucide-react";

import type { Block, Task, ProcessTemplateId } from "@/types";
import { useEditorStore } from "@/store/useEditorStore";
import { listProcessTemplates, getProcessTemplate } from "@/services/template-applier";
import { countBlocks } from "@/utils/blocks";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";

import { TemplateCard } from "./template-card";

interface TemplatesPanelProps {
  blocks: Block[];
  tasks?: Task[];
}

export function TemplatesPanel({ blocks }: TemplatesPanelProps) {
  const t = useTranslations("templates");
  const importBlocksAndTasks = useEditorStore((s) => s.importBlocksAndTasks);

  const [selectedTemplateId, setSelectedTemplateId] = useState<ProcessTemplateId | null>(null);

  const templates = useMemo(() => listProcessTemplates(), []);
  const hasExistingModel = blocks.length > 0;

  const selectedTemplate = selectedTemplateId ? getProcessTemplate(selectedTemplateId) : null;

  const handleConfirmApply = () => {
    if (!selectedTemplate) return;
    importBlocksAndTasks(selectedTemplate.blocks, selectedTemplate.tasks);
    setSelectedTemplateId(null);
  };

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 gap-5 p-4 overflow-y-auto no-scrollbar">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-bold text-foreground tracking-tight">{t("title")}</h2>
        <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
      </div>

      {hasExistingModel && (
        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-start gap-2.5">
          <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-800 dark:text-amber-200 leading-relaxed">
            {t("replaceWarning")}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {templates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            stepCount={countBlocks(template.blocks)}
            onApply={() => setSelectedTemplateId(template.id)}
          />
        ))}
      </div>

      <Dialog open={selectedTemplateId !== null} onOpenChange={() => setSelectedTemplateId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <Layers className="size-4 text-primary" />
              {t("confirmTitle")}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {selectedTemplate
                ? t("confirmDescription", { name: t(selectedTemplate.nameKey) })
                : t("confirmDescriptionGeneric")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedTemplateId(null)}
              className="text-xs"
            >
              {t("cancel")}
            </Button>
            <Button size="sm" onClick={handleConfirmApply} className="text-xs">
              {t("confirmApply")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
