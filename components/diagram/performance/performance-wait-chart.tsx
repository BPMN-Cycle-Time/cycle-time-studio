"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { PerformanceAnalysis } from "@/types";
import { AppCard } from "@/components/ui";

const TOP_BOTTLENECKS = 3;

/** Horizontal bars: share of total waiting time per activity (top 3 highlighted). */
export function PerformanceWaitChart({ analysis }: { analysis: PerformanceAnalysis }) {
  const t = useTranslations("diagram.performance.chart");

  const data = useMemo(
    () =>
      analysis.waitingShareRanking
        .filter((r) => r.share > 0)
        .map((r, i) => ({
          name: r.activity,
          share: Math.round(r.share * 1000) / 10,
          top: i < TOP_BOTTLENECKS,
        })),
    [analysis],
  );

  return (
    <AppCard title={t("title")} description={t("description")}>
      <div className="w-full" style={{ height: Math.max(180, data.length * 34 + 40) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              horizontal={false}
              stroke="var(--muted-foreground)"
              strokeOpacity={0.15}
            />
            <XAxis
              type="number"
              unit="%"
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              axisLine={{ stroke: "var(--muted-foreground)", strokeOpacity: 0.35 }}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={170}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              axisLine={{ stroke: "var(--muted-foreground)", strokeOpacity: 0.35 }}
            />
            <Tooltip
              cursor={{ fill: "var(--muted)", fillOpacity: 0.4 }}
              formatter={(value) => [`${String(value)}%`, t("share")]}
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Bar dataKey="share" radius={[0, 4, 4, 0]}>
              {data.map((d) => (
                <Cell
                  key={d.name}
                  fill={d.top ? "var(--destructive)" : "var(--primary)"}
                  fillOpacity={d.top ? 0.9 : 0.55}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </AppCard>
  );
}
