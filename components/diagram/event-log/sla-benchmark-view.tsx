"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, AlertTriangle, Layers, Percent, Timer } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { EventLogItem, Block, Task } from "@/types";
import { enrichEventsWithSla, computeSlaEvaluation } from "@/services/sla-benchmark";
import { AppCard } from "@/components/ui";
import { KpiStatCard } from "./kpi-stat-card";
import { TaskBenchmarkTable } from "./task-benchmark-table";

interface SlaBenchmarkViewProps {
  events: EventLogItem[];
  blocks: Block[];
  tasks?: Task[];
  unit: string;
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
        iconColorClassName:
          overallComplianceRate >= 80
            ? "bg-emerald-500/10 text-emerald-500"
            : "bg-amber-500/10 text-amber-500",
      },
      {
        id: "total-instances",
        label: tDiag("totalExecutions"),
        value: totalInstances.toLocaleString(),
        icon: Layers,
        iconColorClassName: "bg-indigo-500/10 text-indigo-500",
      },
      {
        id: "met-instances",
        label: tDiag("metExecutions"),
        value: totalMet.toLocaleString(),
        icon: CheckCircle2,
        iconColorClassName: "bg-emerald-500/10 text-emerald-500",
      },
      {
        id: "delayed-instances",
        label: tDiag("delayedExecutions"),
        value: totalDelayed.toLocaleString(),
        icon: AlertTriangle,
        iconColorClassName:
          totalDelayed > 0 ? "bg-rose-500/10 text-rose-500" : "bg-slate-500/10 text-slate-400",
      },
      {
        id: "top-bottleneck",
        label: tDiag("topBottleneckTask"),
        value: topBottleneck,
        icon: Timer,
        iconColorClassName: "bg-amber-500/10 text-amber-500",
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
    <div className="flex flex-col gap-4 w-full">
      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 @[640px]:grid-cols-3 @[1024px]:grid-cols-5 gap-2.5">
        {kpiCards.map((kpi) => (
          <KpiStatCard key={kpi.id} {...kpi} />
        ))}
      </div>

      {/* Process Bottleneck Chart */}
      {slaEvaluation.taskSummaries.length > 0 && (
        <AppCard className="p-4 bg-card border border-border/70 flex flex-col gap-3 shadow-xs">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold capitalize tracking-wider text-muted-foreground">
              {tDiag("bottleneckChartTitle")}
            </h4>
          </div>

          <div className="w-full h-56 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value, name) => {
                    const label = name === "met" ? tDiag("legendMet") : tDiag("legendDelayed");
                    return [value, label];
                  }}
                  labelFormatter={(_label, payload) => {
                    return payload?.[0]?.payload?.fullName || _label;
                  }}
                  contentStyle={{
                    backgroundColor: "var(--color-card, #fff)",
                    borderColor: "var(--color-border, #e2e8f0)",
                    borderRadius: "0.5rem",
                    fontSize: "0.75rem",
                  }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ paddingBottom: "10px", fontSize: "11px" }}
                  formatter={(value) => {
                    return value === "met" ? tDiag("legendMet") : tDiag("legendDelayed");
                  }}
                />
                <Bar dataKey="met" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={36} />
                <Bar dataKey="delayed" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AppCard>
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
