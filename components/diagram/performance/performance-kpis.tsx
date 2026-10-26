"use client";

import { useTranslations } from "next-intl";
import { Gauge, Hourglass, Layers, Timer } from "lucide-react";

import type { PerformanceAnalysis } from "@/types";
import { KpiStatCard } from "../event-log";
import { formatShare, useFormatHours } from "./performance-format";

interface PerformanceKpisProps {
  analysis: PerformanceAnalysis;
}

export function PerformanceKpis({ analysis }: PerformanceKpisProps) {
  const t = useTranslations("diagram.performance.kpi");
  const formatHours = useFormatHours();
  const { summary } = analysis;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <KpiStatCard
        label={t("cases")}
        value={summary.caseCount}
        icon={Layers}
        accentColor="indigo"
      />
      <KpiStatCard
        label={t("cycleTimeMedian")}
        value={formatHours(summary.cycleTime.median)}
        description={t("cycleTimeP90", { value: formatHours(summary.cycleTime.p90) })}
        icon={Timer}
        accentColor="sky"
      />
      <KpiStatCard
        label={t("cte")}
        value={formatShare(summary.cteOverall)}
        description={t("cteHint")}
        icon={Gauge}
        accentColor="emerald"
      />
      <KpiStatCard
        label={t("totalWaiting")}
        value={formatHours(summary.waiting.total)}
        description={t("waitingPerCase", { value: formatHours(summary.waiting.mean) })}
        icon={Hourglass}
        accentColor="amber"
      />
    </div>
  );
}
