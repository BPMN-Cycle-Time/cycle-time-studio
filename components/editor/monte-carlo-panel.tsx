"use client";

import { useTranslations } from "next-intl";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Dices } from "lucide-react";

import type { Block } from "@/types";
import { useSimulation } from "@/hooks";
import { Button, AppCard } from "@/components/ui";

export function MonteCarloPanel({ blocks, unit }: { blocks: Block[]; unit: string }) {
  const tSim = useTranslations("simulation");
  const tBtn = useTranslations("common.buttons");
  const { result, running, execute } = useSimulation(blocks, 5000);

  const chartData =
    result?.histogram.map((b) => ({
      x: (b.x0 + b.x1) / 2,
      label: b.x0.toFixed(1),
      count: b.count,
    })) ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <p className="text-sm text-muted-foreground max-w-[52ch]">{tSim("description")}</p>
        <Button onClick={execute} disabled={running || blocks.length === 0}>
          <Dices /> {running ? tBtn("running") : result ? tSim("reRun") : tSim("run")}
        </Button>
      </div>

      {result && (
        <>
          <div className="grid grid-cols-3 gap-3 mb-5">
            <Stat label={tSim("p50")} value={result.p50} unit={unit} />
            <Stat label={tSim("p85")} value={result.p85} unit={unit} />
            <Stat label={tSim("p95")} value={result.p95} unit={unit} />
          </div>
          <div className="h-56 -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={{ stroke: "var(--border)" }}
                  interval={Math.ceil(chartData.length / 8)}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  width={28}
                />
                <Tooltip
                  formatter={(v) => [tSim("runs", { count: Number(v) }), "count"]}
                  labelFormatter={(l) => `~${l} ${unit}`}
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "var(--popover-foreground)",
                  }}
                />
                <ReferenceLine
                  x={result.p50.toFixed(1)}
                  stroke="var(--primary)"
                  strokeDasharray="4 3"
                />
                <Bar dataKey="count" fill="var(--primary)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            {tSim("stats", {
              mean: result.mean.toFixed(2),
              unit,
              min: result.min.toFixed(2),
              max: result.max.toFixed(2),
            })}
          </p>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <AppCard variant="subtle" className="py-0 bg-muted/50" contentClassName="px-3 py-2.5">
      <div className="text-[0.7rem] uppercase tracking-wide text-muted-foreground mb-1">
        {label}
      </div>
      <div className="font-mono font-semibold text-lg tabular-nums">
        {value.toFixed(2)} <span className="text-xs font-normal text-muted-foreground">{unit}</span>
      </div>
    </AppCard>
  );
}
