"use client";

import { useMemo, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  FileSpreadsheet,
  FileCode,
  RefreshCw,
  Users,
  Activity,
  Layers,
  Clock,
  Coins,
} from "lucide-react";
import type { Block, Task, EventLogItem } from "@/types";
import {
  generateEventLog,
  computeEventLogSummary,
  exportEventLogToCsv,
  exportEventLogToXes,
} from "@/services/event-log";
import { AppCard, Button, DataTable, Badge, AppSelect, type TableColumn } from "@/components/ui";

interface EventLogPanelProps {
  blocks: Block[];
  tasks?: Task[];
  unit: string;
  currency?: string;
}

export function EventLogPanel({ blocks, tasks, unit, currency = "$" }: EventLogPanelProps) {
  const tDiag = useTranslations("diagram");
  const [caseCount, setCaseCount] = useState<number>(20);
  const [seed, setSeed] = useState<number>(1);

  const caseOptions = useMemo(
    () => [
      { value: "10", label: tDiag("casesCountOption", { count: 10 }) },
      { value: "20", label: tDiag("casesCountOption", { count: 20 }) },
      { value: "50", label: tDiag("casesCountOption", { count: 50 }) },
      { value: "100", label: tDiag("casesCountOption", { count: 100 }) },
    ],
    [tDiag],
  );

  // Generate events based on blocks, tasks, caseCount, and seed
  const events = useMemo(() => {
    if (!blocks || blocks.length === 0) return [];
    // seed triggers regeneration
    void seed;
    return generateEventLog(blocks, tasks, unit, { caseCount });
  }, [blocks, tasks, unit, caseCount, seed]);

  const summary = useMemo(() => computeEventLogSummary(events), [events]);

  const handleRegenerate = useCallback(() => {
    setSeed((s) => s + 1);
  }, []);

  const handleDownloadCsv = useCallback(() => {
    if (events.length === 0) return;
    const csvContent = exportEventLogToCsv(events);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `event-log-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [events]);

  const handleDownloadXes = useCallback(() => {
    if (events.length === 0) return;
    const xesContent = exportEventLogToXes(events, "BPMN Process Log");
    const blob = new Blob([xesContent], { type: "application/xml;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `event-log-${Date.now()}.xes`;
    a.click();
    URL.revokeObjectURL(url);
  }, [events]);

  const columns: TableColumn<EventLogItem>[] = useMemo(
    () => [
      {
        key: "caseId",
        header: tDiag("colCaseId"),
        sortable: true,
        render: (row) => (
          <Badge variant="outline" className="font-mono text-xs bg-muted/40 font-medium">
            {row.caseId}
          </Badge>
        ),
      },
      {
        key: "activity",
        header: tDiag("colActivity"),
        sortable: true,
        render: (row) => <span className="font-medium text-foreground">{row.activity}</span>,
      },
      {
        key: "resource",
        header: tDiag("colResource"),
        sortable: true,
        render: (row) => (
          <Badge
            variant="secondary"
            className="text-xs px-2 py-0.5 font-normal bg-primary/10 text-primary border border-primary/20"
          >
            {row.resource}
          </Badge>
        ),
      },
      {
        key: "startTimestamp",
        header: tDiag("colStart"),
        sortable: true,
        render: (row) => (
          <span className="text-xs text-muted-foreground font-mono">
            {new Date(row.startTimestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </span>
        ),
      },
      {
        key: "completeTimestamp",
        header: tDiag("colComplete"),
        sortable: true,
        render: (row) => (
          <span className="text-xs text-muted-foreground font-mono">
            {new Date(row.completeTimestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </span>
        ),
      },
      {
        key: "duration",
        header: `${tDiag("colDuration")} (${unit})`,
        sortable: true,
        render: (row) => (
          <span className="font-mono text-xs">
            {row.duration} <span className="text-muted-foreground">{unit}</span>
          </span>
        ),
      },
      {
        key: "cost",
        header: tDiag("colCost"),
        sortable: true,
        render: (row) => (
          <span className="font-mono text-xs font-medium">
            {currency}
            {row.cost.toLocaleString()}
          </span>
        ),
      },
    ],
    [tDiag, unit, currency],
  );

  return (
    <div className="flex flex-col gap-4 w-full h-full pb-6">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card border border-border/70 p-4 rounded-xl shadow-xs">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            {tDiag("eventLogTitle")}
          </h2>
          <p className="text-xs text-muted-foreground">{tDiag("eventLogDesc")}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>{tDiag("caseCount")}:</span>
            <div className="w-32">
              <AppSelect
                value={String(caseCount)}
                onValueChange={(val) => setCaseCount(Number(val))}
                options={caseOptions}
              />
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRegenerate}
            className="text-xs flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {tDiag("generateEventLog")}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadCsv}
            disabled={events.length === 0}
            className="text-xs flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            {tDiag("exportCsv")}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadXes}
            disabled={events.length === 0}
            className="text-xs flex items-center gap-1.5 text-blue-600 dark:text-blue-400"
          >
            <FileCode className="w-3.5 h-3.5" />
            {tDiag("exportXes")}
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <AppCard className="p-3.5 bg-card/70 border-border/80 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
              {tDiag("totalEvents")}
            </span>
            <div className="p-1 rounded-md bg-indigo-500/10 text-indigo-500 shrink-0">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold font-mono tracking-tight text-foreground">
            {summary.totalEvents.toLocaleString()}
          </div>
        </AppCard>

        <AppCard className="p-3.5 bg-card/70 border-border/80 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
              {tDiag("totalCases")}
            </span>
            <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-500 shrink-0">
              <Activity className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold font-mono tracking-tight text-foreground">
            {summary.totalCases}
          </div>
        </AppCard>

        <AppCard className="p-3.5 bg-card/70 border-border/80 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
              {tDiag("distinctActivities")}
            </span>
            <div className="p-1 rounded-md bg-amber-500/10 text-amber-500 shrink-0">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold font-mono tracking-tight text-foreground">
            {summary.distinctActivities}
          </div>
        </AppCard>

        <AppCard className="p-3.5 bg-card/70 border-border/80 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
              {tDiag("distinctResources")}
            </span>
            <div className="p-1 rounded-md bg-violet-500/10 text-violet-500 shrink-0">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold font-mono tracking-tight text-foreground">
            {summary.distinctResources}
          </div>
        </AppCard>

        <AppCard className="p-3.5 bg-card/70 border-border/80 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
              {tDiag("avgCaseDuration")}
            </span>
            <div className="p-1 rounded-md bg-sky-500/10 text-sky-500 shrink-0">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono tracking-tight text-foreground">
              {summary.avgCaseDuration}
            </span>
            <span className="text-xs text-muted-foreground font-medium">{unit}</span>
          </div>
        </AppCard>

        <AppCard className="p-3.5 bg-card/70 border-border/80 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
              {tDiag("avgCaseCost")}
            </span>
            <div className="p-1 rounded-md bg-amber-500/10 text-amber-500 shrink-0">
              <Coins className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold font-mono tracking-tight text-foreground">
            {currency}
            {summary.avgCaseCost.toLocaleString()}
          </div>
        </AppCard>
      </div>

      {/* Main Table */}
      <AppCard className="p-4 flex-1 flex flex-col min-h-[420px]">
        {events.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground py-12">
            <Activity className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm">{tDiag("noEventsFound")}</p>
          </div>
        ) : (
          <DataTable<EventLogItem>
            data={events}
            columns={columns}
            searchPlaceholder={tDiag("searchEventLog")}
            searchKeys={["caseId", "activity", "resource"]}
          />
        )}
      </AppCard>
    </div>
  );
}
