"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Hourglass, ScrollText } from "lucide-react";

import type { EventLogItem } from "@/types";
import { analyzePerformance, filterEventsByCaseStart } from "@/services/performance-analysis";
import { DEFAULT_WORK_CALENDAR } from "@/services/work-calendar";
import { useEditorStore } from "@/store/useEditorStore";
import { Button } from "@/components/ui";
import type { DiagramTab } from "@/components/layout";
import { PerformanceFilters } from "./performance-filters";
import { PerformanceKpis } from "./performance-kpis";
import { PerformanceActivityTable } from "./performance-activity-table";
import { PerformanceWaitChart } from "./performance-wait-chart";
import { PerformanceResourceTable } from "./performance-resource-table";
import { PerformanceCaseTable } from "./performance-case-table";
import { PerformanceWaitHeatmap } from "./performance-wait-heatmap";

interface PerformancePanelProps {
  uploadedEvents?: EventLogItem[] | null;
  onSwitchDiagramTab?: (tab: DiagramTab) => void;
}

/**
 * Waiting-time / performance analysis of the uploaded event log. Simulated logs are not used:
 * they have no queues, so waiting time would always be zero.
 */
export function PerformancePanel({ uploadedEvents, onSwitchDiagramTab }: PerformancePanelProps) {
  const t = useTranslations("diagram.performance");
  const storedCalendar = useEditorStore((s) => s.project?.workCalendar);
  const setWorkCalendar = useEditorStore((s) => s.setWorkCalendar);
  const calendar = storedCalendar ?? DEFAULT_WORK_CALENDAR;

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [workingHours, setWorkingHours] = useState(false);

  const events = useMemo(
    () => filterEventsByCaseStart(uploadedEvents ?? [], dateFrom, dateTo),
    [uploadedEvents, dateFrom, dateTo],
  );
  const analysis = useMemo(
    () => analyzePerformance(events, workingHours ? { calendar } : {}),
    [events, workingHours, calendar],
  );

  if (!uploadedEvents?.length) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
        <div className="size-12 rounded-2xl bg-muted/60 flex items-center justify-center">
          <Hourglass className="size-6 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground text-sm max-w-sm">{t("empty")}</p>
        {onSwitchDiagramTab && (
          <Button variant="outline" size="sm" onClick={() => onSwitchDiagramTab("eventLog")}>
            <ScrollText className="size-3.5 mr-1.5" />
            {t("goToEventLog")}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 gap-4 p-4 overflow-y-auto no-scrollbar">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-bold text-foreground tracking-tight">{t("title")}</h2>
        <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
      </div>

      <PerformanceFilters
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        workingHours={workingHours}
        onWorkingHoursChange={setWorkingHours}
        calendar={calendar}
        onCalendarChange={setWorkCalendar}
      />

      {analysis.summary.caseCount === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-10">{t("noCasesInRange")}</p>
      ) : (
        <>
          <PerformanceKpis analysis={analysis} />
          <PerformanceWaitChart analysis={analysis} />
          <PerformanceActivityTable analysis={analysis} />
          <PerformanceWaitHeatmap
            events={events}
            analysis={analysis}
            calendar={workingHours ? calendar : undefined}
          />
          <PerformanceResourceTable analysis={analysis} />
          <PerformanceCaseTable analysis={analysis} />
        </>
      )}
    </div>
  );
}
