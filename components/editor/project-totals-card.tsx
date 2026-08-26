"use client";

import { useTranslations } from "next-intl";
import { useEditorStore } from "@/store/useEditorStore";
import { AppCard, AppInput } from "@/components/ui";

interface ProjectTotalsCardProps {
  total: number;
  unit: string;
}

export function ProjectTotalsCard({ total, unit }: ProjectTotalsCardProps) {
  const t = useTranslations("editor");
  const { setUnit } = useEditorStore();

  return (
    <AppCard className="py-4" contentClassName="px-4 flex flex-col gap-3">
      <div>
        <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
          {t("expectedCycleTime")}
        </div>
        <div className="font-mono font-semibold text-3xl tabular-nums">
          {total.toFixed(2)}{" "}
          <span className="text-sm text-muted-foreground font-medium">{unit}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <AppInput
          id="unit"
          label={t("unit")}
          layout="horizontal"
          className="w-24 h-8"
          wrapperClassName="w-auto"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
        />
      </div>
    </AppCard>
  );
}
