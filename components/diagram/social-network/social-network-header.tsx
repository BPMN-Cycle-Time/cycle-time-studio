"use client";

import { useTranslations } from "next-intl";
import {
  Share2,
  ArrowRightLeft,
  Users2,
  Filter,
  RefreshCw,
  FolderOpen,
  X,
  Database,
  Sparkles,
  Upload,
  Download,
} from "lucide-react";
import type { EventLogItem, SocialMetricType } from "@/types";
import { Button, Badge, Tabs, TabsList, TabsTrigger } from "@/components/ui";
import { UploadEventLogDialog } from "../event-log/upload-event-log-dialog";

export interface SocialNetworkHeaderProps {
  isUploaded: boolean;
  metric: SocialMetricType;
  onMetricChange: (m: SocialMetricType) => void;
  availableThresholds: number[];
  thresholdEdgeCounts: Record<number, number>;
  activeThreshold: number;
  onThresholdChange: (thresh: number) => void;
  onUploadEvents?: (events: EventLogItem[] | null) => void;
  onRegenerate: () => void;
  totalNodes: number;
  totalEdges: number;
  onExportPng?: () => void;
  isExporting?: boolean;
}

export function SocialNetworkHeader({
  isUploaded,
  metric,
  onMetricChange,
  availableThresholds,
  thresholdEdgeCounts,
  activeThreshold,
  onThresholdChange,
  onUploadEvents,
  onRegenerate,
  totalNodes,
  totalEdges,
  onExportPng,
  isExporting,
}: SocialNetworkHeaderProps) {
  const tDiag = useTranslations("diagram");

  return (
    <div className="flex flex-col gap-3">
      {/* Row 1: Title, Metrics Tabs, and Threshold Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Share2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground leading-none">
                {tDiag("socialNetworkTitle")}
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
              {tDiag("socialNetworkDesc")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Metric Selector Tabs */}
          <Tabs
            value={metric}
            onValueChange={(val) => onMetricChange(val as SocialMetricType)}
            className="shrink-0"
          >
            <TabsList className="h-8 bg-muted/60 p-0.5 border border-border/60">
              <TabsTrigger
                value="handover"
                className="text-xs px-2.5 h-7 gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>{tDiag("metricHandover")}</span>
              </TabsTrigger>
              <TabsTrigger
                value="workingTogether"
                className="text-xs px-2.5 h-7 gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs"
              >
                <Users2 className="w-3.5 h-3.5" />
                <span>{tDiag("metricWorkingTogether")}</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Min Weight Filter (Dynamic Thresholds) */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground border border-border/70 rounded-lg px-2 py-1 bg-background/50">
            <Filter className="w-3 h-3 text-muted-foreground shrink-0" />
            <span>{tDiag("minThreshold")}:</span>
            <div className="flex items-center gap-1">
              {availableThresholds.map((thresh) => {
                const count = thresholdEdgeCounts[thresh] ?? 0;
                const isSelected = activeThreshold === thresh;
                return (
                  <Button
                    key={thresh}
                    variant={isSelected ? "default" : "ghost"}
                    size="sm"
                    onClick={() => onThresholdChange(thresh)}
                    className="h-6 px-1.5 py-0 text-xs font-mono flex items-center gap-1"
                    title={`Threshold ${thresh}+ (${count} connections)`}
                  >
                    <span>{thresh === 1 ? "1" : `≥${thresh}`}</span>
                    <span
                      className={`text-[10px] px-1 rounded-full leading-tight ${
                        isSelected
                          ? "bg-primary-foreground/20 text-primary-foreground font-semibold"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {count}
                    </span>
                  </Button>
                );
              })}
            </div>
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
              onClick={() => onUploadEvents?.(null)}
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

            {onUploadEvents && (
              <UploadEventLogDialog
                onImport={(items) => onUploadEvents(items)}
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
            )}
          </div>
        </div>

        {/* Right: Mode-Specific Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {!isUploaded ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onRegenerate}
              className="h-8 text-xs flex items-center gap-1.5 bg-background shadow-xs hover:border-primary/50"
            >
              <RefreshCw className="w-3.5 h-3.5 text-primary" />
              <span>{tDiag("rerunSimulation")}</span>
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                <strong className="text-foreground font-semibold">{totalNodes}</strong>{" "}
                {tDiag("colResource").toLowerCase()},{" "}
                <strong className="text-foreground font-semibold">{totalEdges}</strong>{" "}
                {tDiag("discoveredTransitions").toLowerCase()}
              </span>

              {onUploadEvents && (
                <UploadEventLogDialog
                  onImport={(items) => onUploadEvents(items)}
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
              )}

              {onUploadEvents && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onUploadEvents(null)}
                  className="h-7 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30 dark:hover:bg-destructive/20 dark:hover:border-destructive/40 border border-transparent gap-1 px-2.5 rounded-lg transition-colors font-medium"
                  title={tDiag("resetToSimulated")}
                >
                  <X className="w-3.5 h-3.5" />
                  <span>{tDiag("clearUploadedFile")}</span>
                </Button>
              )}
            </div>
          )}

          {onExportPng && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExportPng}
              disabled={isExporting || totalNodes === 0}
              className="h-8 text-xs flex items-center gap-1.5 bg-background shadow-xs hover:border-primary/50 font-medium"
            >
              <Download className="w-3.5 h-3.5 text-primary" />
              <span>{tDiag("exportPng")}</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
