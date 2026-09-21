"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Lightbulb } from "lucide-react";

import { useEditorStore } from "@/store/useEditorStore";
import { analyzeBpr } from "@/services";
import type { Block, Task } from "@/types";

import { BprAsIsSection } from "./bpr-as-is-section";
import { BprIssuesSection } from "./bpr-issues-section";
import { BprRecommendationsSection } from "./bpr-recommendations-section";
import { BprFormulasSection } from "./bpr-formulas-section";

interface BprPanelProps {
  blocks: Block[];
  tasks?: Task[];
  unit: string;
}

export function BprPanel({ blocks, tasks, unit }: BprPanelProps) {
  const t = useTranslations("bpr");
  const currency = useEditorStore((s) => s.project?.currency ?? "");
  const uploadedEvents = useEditorStore((s) => s.project?.uploadedEvents ?? null);

  const analysis = useMemo(
    () => analyzeBpr(blocks, tasks, unit, uploadedEvents),
    [blocks, tasks, unit, uploadedEvents],
  );

  if (blocks.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
        <div className="size-12 rounded-2xl bg-muted/60 flex items-center justify-center">
          <Lightbulb className="size-6 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground text-sm max-w-xs">{t("empty")}</p>
      </div>
    );
  }

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 gap-5 p-4 overflow-y-auto no-scrollbar">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-bold text-foreground tracking-tight">{t("title")}</h2>
        <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
      </div>

      <BprAsIsSection metrics={analysis.metrics} unit={unit} currency={currency} />
      <BprIssuesSection issues={analysis.issues} />
      <BprRecommendationsSection recommendations={analysis.recommendations} />
      <BprFormulasSection />
    </div>
  );
}
