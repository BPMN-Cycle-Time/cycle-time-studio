"use client";

import { useMemo, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Users, Activity, Layers, Clock, Coins, CheckCircle2, AlertTriangle } from "lucide-react";
import type { Block, Task, EventLogItem, EventLogDataSource } from "@/types";
import {
  generateEventLog,
  computeEventLogSummary,
  exportEventLogToCsv,
  exportEventLogToXes,
} from "@/services/event-log";
import { enrichEventsWithSla } from "@/services/sla-benchmark";
import { AppCard, DataTable, Badge, AppSelect, type TableColumn } from "@/components/ui";
import { ConformanceAnalysisView } from "./conformance-analysis-view";
import { SlaBenchmarkView } from "./sla-benchmark-view";
import { KpiStatCard } from "./kpi-stat-card";
import { EventLogHeader } from "./event-log-header";

import type { DiagramTab } from "@/components/layout";

interface EventLogPanelProps {
  blocks: Block[];
  tasks?: Task[];
  unit: string;
  currency?: string;
  uploadedEvents?: EventLogItem[] | null;
  dataSource?: EventLogDataSource;
  onUploadEvents?: (events: EventLogItem[] | null) => void;
  onDataSourceChange?: (source: EventLogDataSource) => void;
  onSwitchDiagramTab?: (tab: DiagramTab) => void;
}

export function EventLogPanel({
  blocks,
  tasks,
  unit,
  currency = "$",
  uploadedEvents: externalUploadedEvents,
  dataSource: externalDataSource,
  onUploadEvents,
  onDataSourceChange,
  onSwitchDiagramTab,
}: EventLogPanelProps) {
  const tDiag = useTranslations("diagram");
  const [caseCount, setCaseCount] = useState<number>(20);
  const [seed, setSeed] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<"data" | "sla" | "conformance">("data");
  const [slaFilter, setSlaFilter] = useState<"all" | "met" | "delayed">("all");
  const [internalUploaded, setInternalUploaded] = useState<EventLogItem[] | null>(null);
  const [internalDataSource, setInternalDataSource] = useState<EventLogDataSource>("simulated");

  const uploadedEvents =
    externalUploadedEvents !== undefined ? externalUploadedEvents : internalUploaded;
  const dataSource = externalDataSource !== undefined ? externalDataSource : internalDataSource;

  const setUploadedEvents = useCallback(
    (events: EventLogItem[] | null) => {
      if (onUploadEvents) {
        onUploadEvents(events);
      } else {
        setInternalUploaded(events);
      }
      if (events && events.length > 0) {
        if (onDataSourceChange) onDataSourceChange("imported");
        else setInternalDataSource("imported");
      }
    },
    [onUploadEvents, onDataSourceChange],
  );

  const setDataSource = useCallback(
    (source: EventLogDataSource) => {
      if (onDataSourceChange) {
        onDataSourceChange(source);
      } else {
        setInternalDataSource(source);
      }
    },
    [onDataSourceChange],
  );

  const hasUploadedFile = Boolean(uploadedEvents && uploadedEvents.length > 0);
  const isImportedActive = dataSource === "imported" && hasUploadedFile;

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
  const generatedEvents = useMemo(() => {
    if (!blocks || blocks.length === 0) return [];
    void seed;
    return generateEventLog(blocks, tasks, unit, { caseCount });
  }, [blocks, tasks, unit, caseCount, seed]);

  const events = isImportedActive ? (uploadedEvents as EventLogItem[]) : generatedEvents;

  // Enrich events with SLA benchmark durations and statuses
  const enrichedEvents = useMemo(() => {
    return enrichEventsWithSla(events, undefined, tasks, blocks);
  }, [events, tasks, blocks]);

  const filteredEvents = useMemo(() => {
    if (slaFilter === "met") return enrichedEvents.filter((e) => e.slaStatus === "met");
    if (slaFilter === "delayed") return enrichedEvents.filter((e) => e.slaStatus === "delayed");
    return enrichedEvents;
  }, [enrichedEvents, slaFilter]);

  const summary = useMemo(() => computeEventLogSummary(events), [events]);

  const kpiCards = useMemo(
    () => [
      {
        id: "total-events",
        label: tDiag("totalEvents"),
        value: summary.totalEvents.toLocaleString(),
        icon: Layers,
        tag: tDiag("kpiTagEvents"),
        accentColor: "indigo" as const,
      },
      {
        id: "total-cases",
        label: tDiag("totalCases"),
        value: summary.totalCases,
        icon: Activity,
        tag: tDiag("kpiTagCases"),
        accentColor: "emerald" as const,
      },
      {
        id: "distinct-activities",
        label: tDiag("distinctActivities"),
        value: summary.distinctActivities,
        icon: Layers,
        tag: tDiag("kpiTagActivities"),
        accentColor: "amber" as const,
      },
      {
        id: "distinct-resources",
        label: tDiag("distinctResources"),
        value: summary.distinctResources,
        icon: Users,
        tag: tDiag("kpiTagResources"),
        accentColor: "violet" as const,
      },
      {
        id: "avg-duration",
        label: tDiag("avgCaseDuration"),
        value: summary.avgCaseDuration,
        unit,
        icon: Clock,
        tag: tDiag("kpiTagDuration"),
        accentColor: "sky" as const,
      },
      {
        id: "avg-cost",
        label: tDiag("avgCaseCost"),
        value: `${currency}${summary.avgCaseCost.toLocaleString()}`,
        icon: Coins,
        tag: tDiag("kpiTagCost"),
        accentColor: "rose" as const,
      },
    ],
    [tDiag, summary, unit, currency],
  );

  const handleRegenerate = useCallback(() => {
    setSeed((s) => s + 1);
  }, []);

  const handleResetToSimulated = useCallback(() => {
    setDataSource("simulated");
  }, [setDataSource]);

  const handleSelectUploaded = useCallback(() => {
    setDataSource("imported");
  }, [setDataSource]);

  const handleClearUploadedFile = useCallback(() => {
    setUploadedEvents(null);
    setDataSource("simulated");
  }, [setUploadedEvents, setDataSource]);

  const handleDownloadCsv = useCallback(() => {
    if (enrichedEvents.length === 0) return;
    const csvContent = exportEventLogToCsv(enrichedEvents);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `event-log-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [enrichedEvents]);

  const handleDownloadXes = useCallback(() => {
    if (enrichedEvents.length === 0) return;
    const xesContent = exportEventLogToXes(enrichedEvents, "BPMN Process Log");
    const blob = new Blob([xesContent], { type: "application/xml;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `event-log-${Date.now()}.xes`;
    a.click();
    URL.revokeObjectURL(url);
  }, [enrichedEvents]);

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
        header: `${tDiag("colActualDuration", { unit })}`,
        sortable: true,
        render: (row) => (
          <span className="font-mono text-xs font-medium">
            {row.duration} <span className="text-muted-foreground">{unit}</span>
          </span>
        ),
      },
      {
        key: "benchmarkDuration",
        header: `${tDiag("colBenchmarkDuration", { unit })}`,
        sortable: true,
        render: (row) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.benchmarkDuration !== undefined ? `${row.benchmarkDuration} ${unit}` : "—"}
          </span>
        ),
      },
      {
        key: "slaStatus",
        header: tDiag("colSlaResult"),
        sortable: true,
        render: (row) => {
          if (!row.slaStatus) return <span className="text-muted-foreground text-xs">—</span>;
          const isMet = row.slaStatus === "met";
          return (
            <Badge
              variant={isMet ? "secondary" : "destructive"}
              className={`text-xs px-2 py-0.5 font-medium gap-1 ${
                isMet
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                  : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30"
              }`}
            >
              {isMet ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
              )}
              <span>{isMet ? tDiag("slaMet") : tDiag("slaDelayed")}</span>
            </Badge>
          );
        },
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
    <div className="flex flex-col gap-3.5 w-full h-full pb-6 @container">
      {/* Redesigned 2-tier Header & Dedicated Data Source Bar */}
      <EventLogHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isUploaded={isImportedActive}
        hasUploadedFile={hasUploadedFile}
        uploadedEventCount={uploadedEvents?.length ?? 0}
        caseCount={caseCount}
        onCaseCountChange={setCaseCount}
        caseOptions={caseOptions}
        onRegenerate={handleRegenerate}
        onResetToSimulated={handleResetToSimulated}
        onSelectUploaded={handleSelectUploaded}
        onClearUploadedFile={handleClearUploadedFile}
        onImportEvents={setUploadedEvents}
        events={events}
        onExportCsv={handleDownloadCsv}
        onExportXes={handleDownloadXes}
        onSwitchDiagramTab={onSwitchDiagramTab}
      />

      {activeTab === "conformance" ? (
        <ConformanceAnalysisView
          events={enrichedEvents}
          blocks={blocks}
          tasks={tasks}
          unit={unit}
          currency={currency}
          onSwitchDiagramTab={onSwitchDiagramTab}
        />
      ) : activeTab === "sla" ? (
        <SlaBenchmarkView events={enrichedEvents} blocks={blocks} tasks={tasks} unit={unit} />
      ) : (
        <>
          {/* Summary KPI Cards - Responsive grid based on container width */}
          <div className="grid grid-cols-2 @[480px]:grid-cols-3 @[960px]:grid-cols-6 gap-2.5">
            {kpiCards.map((kpi) => (
              <KpiStatCard key={kpi.id} {...kpi} />
            ))}
          </div>

          {/* Main Table Toolbar with SLA Filter */}
          <div className="flex items-center justify-between gap-2 flex-wrap px-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">
                {tDiag("colSlaResult")}:
              </span>
              <div className="w-40">
                <AppSelect
                  value={slaFilter}
                  onValueChange={(val) => setSlaFilter(val as "all" | "met" | "delayed")}
                  options={[
                    { value: "all", label: tDiag("filterAllSla") },
                    { value: "met", label: tDiag("filterMetOnly") },
                    { value: "delayed", label: tDiag("filterDelayedOnly") },
                  ]}
                  triggerClassName="h-7 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Main Table */}
          {filteredEvents.length === 0 ? (
            <AppCard className="flex-1 flex flex-col items-center justify-center text-muted-foreground py-12 border-border/80">
              <Activity className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm">{tDiag("noEventsFound")}</p>
            </AppCard>
          ) : (
            <DataTable<EventLogItem>
              data={filteredEvents}
              columns={columns}
              searchPlaceholder={tDiag("searchEventLog")}
              searchKeys={["caseId", "activity", "resource"]}
            />
          )}
        </>
      )}

      {/* Safe bottom spacing so table footer and pagination never touch screen edge */}
      <div className="h-1 shrink-0 w-full" aria-hidden="true" />
    </div>
  );
}
