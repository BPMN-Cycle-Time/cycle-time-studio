"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, AlertTriangle, Layers, Percent, Timer, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { EventLogItem, Block, Task } from "@/types";
import { enrichEventsWithSla, computeSlaEvaluation } from "@/services/sla-benchmark";
import { KpiStatCard } from "./kpi-stat-card";
import { TaskBenchmarkTable } from "./task-benchmark-table";

interface SlaBenchmarkViewProps {
  events: EventLogItem[];
  blocks: Block[];
  tasks?: Task[];
  unit: string;
}

interface SlaChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      fullName: string;
      name: string;
      met: number;
      delayed: number;
      rate: number;
    };
  }>;
  legendMet: string;
  legendDelayed: string;
  fitnessLabel: string;
}

function SlaChartTooltip({
  active,
  payload,
  legendMet,
  legendDelayed,
  fitnessLabel,
}: SlaChartTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  const total = data.met + data.delayed;

  return (
    <div className="bg-popover/95 backdrop-blur-md border border-border/80 rounded-2xl p-3.5 shadow-xl flex flex-col gap-2.5 min-w-[200px] text-xs">
      <div className="font-semibold text-foreground border-b border-border/60 pb-1.5 flex items-center justify-between gap-3">
        <span className="truncate max-w-[160px]">{data.fullName}</span>
        <span className="text-[11px] font-mono text-muted-foreground font-normal shrink-0">
          {total} runs
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500" />
            <span>{legendMet}</span>
          </span>
          <span className="font-mono font-bold">{data.met}</span>
        </div>
        <div className="flex items-center justify-between text-rose-700 dark:text-rose-400">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-rose-500" />
            <span>{legendDelayed}</span>
          </span>
          <span className="font-mono font-bold">{data.delayed}</span>
        </div>
      </div>
      <div className="pt-1.5 border-t border-border/60 flex items-center justify-between text-muted-foreground text-[11px]">
        <span>{fitnessLabel}</span>
        <span className="font-bold font-mono text-foreground">{data.rate.toFixed(1)}%</span>
      </div>
    </div>
  );
}

export function SlaBenchmarkView({ events, blocks, tasks, unit }: SlaBenchmarkViewProps) {
  const tDiag = useTranslations("diagram");

  // Custom user overrides for benchmarks: { [taskId]: duration }
  const [customBenchmarks, setCustomBenchmarks] = useState<Record<string, number>>({});

  const handleBenchmarkChange = (taskId: string, newBenchmark: number) => {
    setCustomBenchmarks((prev) => ({
      ...prev,
      [taskId]: newBenchmark,
    }));
  };

  const handleResetBenchmarks = () => {
    setCustomBenchmarks({});
  };

  // Re-evaluate SLA on the fly when events or customBenchmarks change
  const enrichedEvents = useMemo(() => {
    return enrichEventsWithSla(events, customBenchmarks, tasks, blocks);
  }, [events, customBenchmarks, tasks, blocks]);

  const slaEvaluation = useMemo(() => {
    return computeSlaEvaluation(enrichedEvents);
  }, [enrichedEvents]);

  // KPI Stat Cards
  const kpiCards = useMemo(() => {
    const { overallComplianceRate, totalInstances, totalMet, totalDelayed, topDelayedTasks } =
      slaEvaluation;

    const topBottleneck = topDelayedTasks[0]
      ? `${topDelayedTasks[0].taskName} (${topDelayedTasks[0].delayedCount})`
      : tDiag("noDelayedTasks");

    return [
      {
        id: "overall-compliance",
        label: tDiag("overallSlaCompliance"),
        value: `${overallComplianceRate.toFixed(1)}%`,
        icon: Percent,
        tag: tDiag("kpiTagSlaRate"),
        accentColor: "sky" as const,
      },
      {
        id: "total-instances",
        label: tDiag("totalExecutions"),
        value: totalInstances.toLocaleString(),
        icon: Layers,
        tag: tDiag("kpiTagTotalExecutions"),
        accentColor: "indigo" as const,
      },
      {
        id: "met-instances",
        label: tDiag("metExecutions"),
        value: totalMet.toLocaleString(),
        icon: CheckCircle2,
        tag: tDiag("slaMet"),
        accentColor: "emerald" as const,
      },
      {
        id: "delayed-instances",
        label: tDiag("delayedExecutions"),
        value: totalDelayed.toLocaleString(),
        icon: AlertTriangle,
        tag: tDiag("slaDelayed"),
        accentColor: "rose" as const,
      },
      {
        id: "top-bottleneck",
        label: tDiag("topBottleneckTask"),
        value: topBottleneck,
        icon: Timer,
        tag: tDiag("kpiTagBottleneck"),
        accentColor: "amber" as const,
      },
    ];
  }, [slaEvaluation, tDiag]);

  // Chart data for Met vs Delayed comparison
  const chartData = useMemo(() => {
    return slaEvaluation.taskSummaries.map((t) => ({
      name: t.taskName.length > 14 ? `${t.taskName.slice(0, 12)}...` : t.taskName,
      fullName: t.taskName,
      met: t.metCount,
      delayed: t.delayedCount,
      rate: t.complianceRate,
    }));
  }, [slaEvaluation.taskSummaries]);

  const hasCustomBenchmarks = Object.keys(customBenchmarks).length > 0;

  return (
    <div className="flex flex-col gap-4 w-full @container">
      {/* Top KPI Cards - Styled like Event Log Data KPI Cards */}
      <div className="grid grid-cols-2 @[480px]:grid-cols-3 @[960px]:grid-cols-5 gap-2.5">
        {kpiCards.map((kpi) => (
          <KpiStatCard key={kpi.id} {...kpi} />
        ))}
      </div>

      {/* Process Bottleneck Chart - Taller, Elevated, and Beautiful */}
      {slaEvaluation.taskSummaries.length > 0 && (
        <div className="rounded-2xl border border-border/70 bg-card p-5 pb-0 flex flex-col gap-4 shadow-xs">
          {/* Header & Custom Modern Legend */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground leading-none">
                  {tDiag("bottleneckChartTitle")}
                </h4>
                <p className="text-xs text-muted-foreground mt-1">{tDiag("slaEvaluationDesc")}</p>
              </div>
            </div>

            {/* Custom Modern Pill Legend with dynamic totals */}
            <div className="flex items-center gap-2.5 text-xs bg-muted/40 border border-border/60 rounded-xl px-3 py-1.5 shadow-2xs">
              <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
                <span className="size-2.5 rounded-full bg-emerald-500 shadow-2xs" />
                <span>{tDiag("legendMet")}</span>
                <span className="font-mono font-bold text-foreground">
                  ({slaEvaluation.totalMet})
                </span>
              </div>
              <div className="h-3.5 w-px bg-border/80" />
              <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 font-medium">
                <span className="size-2.5 rounded-full bg-rose-500 shadow-2xs" />
                <span>{tDiag("legendDelayed")}</span>
                <span className="font-mono font-bold text-foreground">
                  ({slaEvaluation.totalDelayed})
                </span>
              </div>
            </div>
          </div>

          {/* Taller Chart: h-[340px] with Gradients, Soft Gridlines & Rounded Bars */}
          <div className="w-full h-[340px] pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 12, right: 16, left: -20, bottom: 28 }}>
                <defs>
                  <linearGradient id="slaMetGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.8} />
                  </linearGradient>
                  <linearGradient id="slaDelayedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#e11d48" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--muted-foreground)"
                  strokeOpacity={0.15}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  tickLine={{ stroke: "var(--muted-foreground)", strokeOpacity: 0.35 }}
                  axisLine={{
                    stroke: "var(--muted-foreground)",
                    strokeOpacity: 0.35,
                    strokeWidth: 1.5,
                  }}
                  dy={4}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={{ stroke: "var(--muted-foreground)", strokeOpacity: 0.35 }}
                  axisLine={{
                    stroke: "var(--muted-foreground)",
                    strokeOpacity: 0.35,
                    strokeWidth: 1.5,
                  }}
                />
                <Tooltip
                  content={
                    <SlaChartTooltip
                      legendMet={tDiag("legendMet")}
                      legendDelayed={tDiag("legendDelayed")}
                      fitnessLabel={tDiag("colFitness")}
                    />
                  }
                />
                <Bar
                  dataKey="met"
                  fill="url(#slaMetGradient)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={32}
                />
                <Bar
                  dataKey="delayed"
                  fill="url(#slaDelayedGradient)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Task Benchmark Summary Table */}
      <TaskBenchmarkTable
        taskSummaries={slaEvaluation.taskSummaries}
        unit={unit}
        onBenchmarkChange={handleBenchmarkChange}
        onResetBenchmarks={handleResetBenchmarks}
        hasCustomBenchmarks={hasCustomBenchmarks}
      />
    </div>
  );
}
