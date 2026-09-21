"use client";

import { useTranslations } from "next-intl";
import {
  Clock,
  DollarSign,
  Briefcase,
  Wallet,
  ListChecks,
  GitFork,
  Layers,
  Repeat,
  Activity,
  ShieldCheck,
} from "lucide-react";

import { AppCard } from "@/components/ui";
import { KpiStatCard } from "@/components/diagram/event-log/kpi-stat-card";
import type { BprAsIsMetrics } from "@/types";
import { formatTime, formatPercent } from "@/utils/formats";

interface BprAsIsSectionProps {
  metrics: BprAsIsMetrics;
  unit: string;
  currency: string;
}

export function BprAsIsSection({ metrics, unit, currency }: BprAsIsSectionProps) {
  const t = useTranslations("bpr");

  const timeValue = formatTime(metrics.totalTime, unit, 2);
  const costValue = metrics.totalCost.toLocaleString(undefined, { maximumFractionDigits: 2 });
  const laborValue = metrics.laborCost.toLocaleString(undefined, { maximumFractionDigits: 2 });
  const fixedValue = metrics.fixedCost.toLocaleString(undefined, { maximumFractionDigits: 2 });
  const fitnessValue = metrics.fitness !== undefined ? formatPercent(metrics.fitness, 1) : "—";
  const slaValue =
    metrics.slaCompliance !== undefined ? formatPercent(metrics.slaCompliance, 1) : "—";

  return (
    <AppCard title={t("sections.asIs")} contentClassName="flex flex-col gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiStatCard
          label={t("metrics.totalTime")}
          value={timeValue}
          unit={unit}
          icon={Clock}
          accentColor="indigo"
        />
        <KpiStatCard
          label={t("metrics.totalCost")}
          value={costValue}
          unit={currency}
          icon={DollarSign}
          accentColor="emerald"
        />
        <KpiStatCard
          label={t("metrics.laborCost")}
          value={laborValue}
          unit={currency}
          icon={Briefcase}
          accentColor="sky"
        />
        <KpiStatCard
          label={t("metrics.fixedCost")}
          value={fixedValue}
          unit={currency}
          icon={Wallet}
          accentColor="violet"
        />
        <KpiStatCard
          label={t("metrics.taskCount")}
          value={metrics.taskCount}
          icon={ListChecks}
          accentColor="amber"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiStatCard
          label={t("metrics.xorCount")}
          value={metrics.xorCount}
          icon={GitFork}
          accentColor="amber"
        />
        <KpiStatCard
          label={t("metrics.andCount")}
          value={metrics.andCount}
          icon={Layers}
          accentColor="amber"
        />
        <KpiStatCard
          label={t("metrics.loopCount")}
          value={metrics.loopCount}
          icon={Repeat}
          accentColor="rose"
        />
        <KpiStatCard
          label={t("metrics.fitness")}
          value={fitnessValue}
          icon={ShieldCheck}
          accentColor="emerald"
        />
        <KpiStatCard
          label={t("metrics.slaCompliance")}
          value={slaValue}
          icon={Activity}
          accentColor="emerald"
        />
      </div>
    </AppCard>
  );
}
