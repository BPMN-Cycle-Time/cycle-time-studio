"use client";

import { useTranslations } from "next-intl";
import {
  Activity,
  Table2,
  Percent,
  ShieldCheck,
  FileSpreadsheet,
  FileCode,
  Database,
  Sparkles,
  Upload,
  FolderOpen,
  X,
  RefreshCw,
} from "lucide-react";
import type { EventLogItem } from "@/types";
import { Button, Badge, Tabs, TabsList, TabsTrigger, AppSelect } from "@/components/ui";
import type { DiagramTab } from "@/components/layout";
import { UploadEventLogDialog } from "./upload-event-log-dialog";
import { DiscoveredBpmnDialog } from "./discovered-bpmn-dialog";

export interface EventLogHeaderProps {
  activeTab: "data" | "sla" | "conformance";
  onTabChange: (tab: "data" | "sla" | "conformance") => void;
  isUploaded: boolean;
  uploadedEventCount: number;
  caseCount: number;
  onCaseCountChange: (count: number) => void;
  caseOptions: { label: string; value: string }[];
  onRegenerate: () => void;
  onResetToSimulated: () => void;
  onImportEvents: (events: EventLogItem[]) => void;
  events: EventLogItem[];
  onExportCsv: () => void;
  onExportXes: () => void;
  onSwitchDiagramTab?: (tab: DiagramTab) => void;
}

export function EventLogHeader({
  activeTab,
  onTabChange,
  isUploaded,
  uploadedEventCount,
  caseCount,
  onCaseCountChange,
  caseOptions,
  onRegenerate,
  onResetToSimulated,
  onImportEvents,
  events,
  onExportCsv,
  onExportXes,
  onSwitchDiagramTab,
}: EventLogHeaderProps) {
  const tDiag = useTranslations("diagram");

  return (
    <div className="flex flex-col gap-3 w-full bg-card border border-border/70 p-3.5 rounded-2xl shadow-xs">
      {/* Row 1: Title, Sub-tabs & Discovery / Export */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-semibold text-foreground leading-none">
                {tDiag("eventLogTitle")}
              </h2>
              {isUploaded ? (
                <Badge
                  variant="secondary"
                  className="text-[11px] bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 px-2 py-0.2"
                >
                  {tDiag("sourceUploadedFile")}
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="text-[11px] text-muted-foreground border-border/70 px-2 py-0.2"
                >
                  {tDiag("sourceSimulatedBpmn")}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
              {tDiag("eventLogDesc")}
            </p>
          </div>
        </div>

        {/* Sub-tabs & Action controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <Tabs
            value={activeTab}
            onValueChange={(val) => onTabChange(val as "data" | "sla" | "conformance")}
          >
            <TabsList className="h-8 bg-muted/60 p-0.5 border border-border/60">
              <TabsTrigger
                value="data"
                className="text-xs px-2.5 h-7 gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs"
              >
                <Table2 className="w-3.5 h-3.5" />
                <span>{tDiag("tabEventLogData")}</span>
              </TabsTrigger>
              <TabsTrigger
                value="sla"
                className="text-xs px-2.5 h-7 gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs"
              >
                <Percent className="w-3.5 h-3.5" />
                <span>{tDiag("tabSlaEvaluation")}</span>
              </TabsTrigger>
              <TabsTrigger
                value="conformance"
                className="text-xs px-2.5 h-7 gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{tDiag("tabConformanceChecking")}</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="h-4 w-[1px] bg-border/80 hidden md:block" />

          {/* Discovery As-Is BPMN */}
          <DiscoveredBpmnDialog events={events} onSwitchDiagramTab={onSwitchDiagramTab} />

          {/* Export CSV & XES */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={onExportCsv}
              disabled={events.length === 0}
              className="h-8 text-xs flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700"
              title={tDiag("exportCsv")}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">CSV</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onExportXes}
              disabled={events.length === 0}
              className="h-8 text-xs flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-700"
              title={tDiag("exportXes")}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">XES</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Row 2: Dedicated Data Source Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-border/60 bg-muted/30 px-3 py-2 rounded-xl">
        {/* Left: Segmented Data Source Switch */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Database className="w-3.5 h-3.5 text-primary" />
            <span>{tDiag("dataSourceLabel")}:</span>
          </div>

          <div className="inline-flex rounded-lg p-0.5 bg-background border border-border/80 shadow-2xs">
            <button
              type="button"
              onClick={onResetToSimulated}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                !isUploaded
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
              title={tDiag("modeSimulatedDesc")}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{tDiag("modeSimulated")}</span>
            </button>

            <UploadEventLogDialog
              onImport={onImportEvents}
              trigger={
                <button
                  type="button"
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    isUploaded
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                  title={tDiag("modeUploadedDesc")}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{tDiag("modeUploaded")}</span>
                </button>
              }
            />
          </div>
        </div>

        {/* Right: Mode-Specific Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {!isUploaded ? (
            <>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>{tDiag("caseCount")}:</span>
                <div className="w-24">
                  <AppSelect
                    value={String(caseCount)}
                    onValueChange={(val) => onCaseCountChange(Number(val))}
                    options={caseOptions}
                  />
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={onRegenerate}
                className="h-8 text-xs flex items-center gap-1.5 bg-background shadow-xs hover:border-primary/50"
              >
                <RefreshCw className="w-3.5 h-3.5 text-primary" />
                <span>{tDiag("rerunSimulation")}</span>
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                <strong className="text-foreground font-semibold">{uploadedEventCount}</strong>{" "}
                {tDiag("tabEventLogData").toLowerCase()}
              </span>

              <UploadEventLogDialog
                onImport={onImportEvents}
                trigger={
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs flex items-center gap-1.5 bg-background shadow-xs"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{tDiag("changeUploadedFile")}</span>
                  </Button>
                }
              />

              <Button
                variant="ghost"
                size="sm"
                onClick={onResetToSimulated}
                className="h-7 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30 dark:hover:bg-destructive/20 dark:hover:border-destructive/40 border border-transparent gap-1 px-2.5 rounded-lg transition-colors font-medium"
                title={tDiag("resetToSimulated")}
              >
                <X className="w-3.5 h-3.5" />
                <span>{tDiag("clearUploadedFile")}</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
