"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import type { EventLogItem, PerformanceAnalysis, WorkCalendar } from "@/types";
import { waitingHeatmap } from "@/services/performance-analysis";
import { AppCard, AppSelect } from "@/components/ui";
import { useFormatHours } from "./performance-format";

/** Monday-first display order of JS weekdays (0 = Sunday). */
const WEEKDAYS = [1, 2, 3, 4, 5, 6, 0] as const;
const HOURS = Array.from({ length: 24 }, (_, h) => h);

interface PerformanceWaitHeatmapProps {
  events: EventLogItem[];
  analysis: PerformanceAnalysis;
  calendar?: WorkCalendar;
}

/** Mean waiting time of one activity by weekday × hour in which the wait began. */
export function PerformanceWaitHeatmap({
  events,
  analysis,
  calendar,
}: PerformanceWaitHeatmapProps) {
  const t = useTranslations("diagram.performance.heatmap");
  const tDays = useTranslations("diagram.performance.calendar.days");
  const formatHours = useFormatHours();

  const options = analysis.waitingShareRanking.map((r) => ({
    value: r.activity,
    label: r.activity,
  }));
  const [picked, setPicked] = useState<string>("");
  const activity = options.some((o) => o.value === picked) ? picked : (options[0]?.value ?? "");

  const heatmap = useMemo(
    () => (activity ? waitingHeatmap(events, activity, calendar ? { calendar } : {}) : null),
    [events, activity, calendar],
  );

  return (
    <AppCard
      title={t("title")}
      description={t("description")}
      headerExtra={
        <AppSelect
          size="sm"
          value={activity}
          onValueChange={setPicked}
          options={options}
          aria-label={t("activity")}
          triggerClassName="min-w-[200px]"
        />
      }
    >
      {heatmap && (
        <div className="overflow-x-auto">
          <div
            className="grid gap-px text-[10px] min-w-[640px]"
            style={{ gridTemplateColumns: "36px repeat(24, minmax(0, 1fr))" }}
          >
            <span />
            {HOURS.map((h) => (
              <span key={h} className="text-center text-muted-foreground font-mono">
                {h}
              </span>
            ))}
            {WEEKDAYS.map((day) => (
              <div key={day} className="contents">
                <span className="text-muted-foreground font-medium self-center">
                  {tDays(String(day))}
                </span>
                {HOURS.map((h) => {
                  const cell = heatmap.cells[day]![h]!;
                  const intensity =
                    heatmap.maxMeanWaiting > 0 ? cell.meanWaiting / heatmap.maxMeanWaiting : 0;
                  const label = cell.count
                    ? t("cell", {
                        day: tDays(String(day)),
                        hour: h,
                        count: cell.count,
                        mean: formatHours(cell.meanWaiting),
                      })
                    : t("emptyCell", { day: tDays(String(day)), hour: h });
                  return (
                    <div
                      key={h}
                      title={label}
                      aria-label={label}
                      className="relative h-6 rounded-sm bg-muted/40 overflow-hidden"
                    >
                      {cell.count > 0 && (
                        <span
                          className="absolute inset-0 bg-destructive"
                          style={{ opacity: 0.12 + 0.88 * intensity }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {t("legend", { max: formatHours(heatmap.maxMeanWaiting) })}
          </p>
        </div>
      )}
    </AppCard>
  );
}
