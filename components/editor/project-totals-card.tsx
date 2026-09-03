"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useEditorStore } from "@/store/useEditorStore";
import { AppCard, AppSelect, type SelectOption } from "@/components/ui";
import { CURRENCIES, DEFAULT_CURRENCY, TIME_UNITS } from "@/constants";

interface ProjectTotalsCardProps {
  total: number;
  unit: string;
  totalCost?: number;
  laborCost?: number;
  fixedCost?: number;
  currency?: string;
}

export function ProjectTotalsCard({
  total,
  unit,
  totalCost = 0,
  laborCost = 0,
  fixedCost = 0,
  currency = DEFAULT_CURRENCY,
}: ProjectTotalsCardProps) {
  const t = useTranslations("editor");
  const tUnits = useTranslations("common.units");
  const { setUnit, setCurrency } = useEditorStore();

  const unitOptions: SelectOption<string>[] = useMemo(() => {
    const list = TIME_UNITS.map((u) => ({
      value: u,
      label: tUnits(u),
    }));
    if (unit && !TIME_UNITS.includes(unit as (typeof TIME_UNITS)[number])) {
      return [{ value: unit, label: unit }, ...list];
    }
    return list;
  }, [tUnits, unit]);

  const currencyOptions: SelectOption<string>[] = useMemo(
    () =>
      CURRENCIES.map((c) => ({
        value: c.code,
        label: `${c.symbol} ${c.code}`,
      })),
    [],
  );

  const displayUnit = TIME_UNITS.includes(unit as (typeof TIME_UNITS)[number])
    ? tUnits(unit)
    : unit;

  const currentCurrency = CURRENCIES.find((c) => c.code === currency) ?? CURRENCIES[0];
  const symbol = currentCurrency.symbol;

  return (
    <div className="@container">
      <div className="grid grid-cols-1 @xl:grid-cols-2 gap-3">
        {/* Expected Cycle Time */}
        <AppCard className="py-3.5" contentClassName="px-4 flex flex-col justify-between gap-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("expectedCycleTime")}
            </span>
            <AppSelect
              value={unit}
              onValueChange={setUnit}
              options={unitOptions}
              triggerClassName="w-24 h-7 text-xs font-medium"
            />
          </div>
          <div className="font-mono font-bold text-2xl lg:text-3xl tabular-nums text-foreground flex items-baseline gap-1.5">
            {total.toFixed(2)}
            <span className="text-xs text-muted-foreground font-sans font-medium">
              {displayUnit}
            </span>
          </div>
        </AppCard>

        {/* Expected Process Cost */}
        <AppCard className="py-3.5" contentClassName="px-4 flex flex-col justify-between gap-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("expectedCost")}
            </span>
            <AppSelect
              value={currency}
              onValueChange={setCurrency}
              options={currencyOptions}
              triggerClassName="w-24 h-7 text-xs font-medium"
            />
          </div>
          <div className="flex flex-col gap-1">
            <div className="font-mono font-bold text-2xl lg:text-3xl tabular-nums text-foreground flex items-baseline gap-1.5">
              <span className="text-lg text-muted-foreground font-sans">{symbol}</span>
              {totalCost.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-muted-foreground font-mono">
              <span className="whitespace-nowrap">
                {t("laborCost")}: {symbol}
                {laborCost.toFixed(2)}
              </span>
              <span className="text-muted-foreground/40 select-none">•</span>
              <span className="whitespace-nowrap">
                {t("fixedCost")}: {symbol}
                {fixedCost.toFixed(2)}
              </span>
            </div>
          </div>
        </AppCard>
      </div>
    </div>
  );
}
