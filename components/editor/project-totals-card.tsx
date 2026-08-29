"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useEditorStore } from "@/store/useEditorStore";
import { AppCard, AppSelect, type SelectOption } from "@/components/ui";
import { TIME_UNITS } from "@/constants";

interface ProjectTotalsCardProps {
  total: number;
  unit: string;
}

export function ProjectTotalsCard({ total, unit }: ProjectTotalsCardProps) {
  const t = useTranslations("editor");
  const tUnits = useTranslations("common.units");
  const { setUnit } = useEditorStore();

  const unitOptions: SelectOption<string>[] = useMemo(() => {
    const list = TIME_UNITS.map((u) => ({
      value: u,
      label: tUnits(u),
    }));
    // If current unit is custom (not in standard list), preserve it
    if (unit && !TIME_UNITS.includes(unit as (typeof TIME_UNITS)[number])) {
      return [{ value: unit, label: unit }, ...list];
    }
    return list;
  }, [tUnits, unit]);

  const displayUnit = TIME_UNITS.includes(unit as (typeof TIME_UNITS)[number])
    ? tUnits(unit)
    : unit;

  return (
    <AppCard className="py-4" contentClassName="px-4 flex items-end justify-between gap-3">
      <div>
        <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
          {t("expectedCycleTime")}
        </div>
        <div className="font-mono font-semibold text-3xl tabular-nums">
          {total.toFixed(2)}{" "}
          <span className="text-sm text-muted-foreground font-medium">{displayUnit}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <AppSelect
          value={unit}
          onValueChange={setUnit}
          options={unitOptions}
          triggerClassName="w-28 font-medium"
        />
      </div>
    </AppCard>
  );
}
