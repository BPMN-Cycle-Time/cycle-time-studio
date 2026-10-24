"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Bot, BarChart3, Table2, TrendingUp, Clock, Target } from "lucide-react";

import type { Block, EventLogItem, EventLogDataSource, Task } from "@/types";
import { generateEventLog } from "@/services/event-log";
import { analyzeAutomationOpportunities } from "@/services/automation-opportunities";
import { Card, CardContent, Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui";

import { AutomationScoreCard } from "./automation-score-card";
import { AutomationMatrixTable } from "./automation-matrix-table";

interface AutomationPanelProps {
  blocks: Block[];
  tasks?: Task[];
  unit: string;
  uploadedEvents?: EventLogItem[] | null;
  dataSource?: EventLogDataSource;
}

export function AutomationPanel({
  blocks,
  tasks,
  unit,
  uploadedEvents,
  dataSource = "simulated",
}: AutomationPanelProps) {
  const t = useTranslations("automation");

  const hasUploadedFile = Boolean(uploadedEvents && uploadedEvents.length > 0);
  const isImportedActive = dataSource === "imported" && hasUploadedFile;

  const events = useMemo(() => {
    if (isImportedActive) return uploadedEvents as EventLogItem[];
    if (!blocks || blocks.length === 0) return [];
    return generateEventLog(blocks, tasks, unit, { caseCount: 100 });
  }, [isImportedActive, uploadedEvents, blocks, tasks, unit]);

  const analysis = useMemo(() => analyzeAutomationOpportunities(events), [events]);

  const [view, setView] = useState<"cards" | "matrix">("cards");

  if (events.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
        <div className="size-12 rounded-2xl bg-muted/60 flex items-center justify-center">
          <Bot className="size-6 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground text-sm max-w-xs">{t("empty")}</p>
      </div>
    );
  }

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 gap-5 p-4 overflow-y-auto no-scrollbar">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-bold text-foreground tracking-tight">{t("title")}</h2>
        <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-2.5">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1">
              <Target className="size-3" />
              {t("candidateCount")}
            </div>
            <span className="text-lg font-bold font-mono text-foreground">
              {analysis.totalCandidates}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1">
              <TrendingUp className="size-3" />
              {t("estimatedSavings")}
            </div>
            <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {analysis.totalEstimatedHoursSaved}h
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1">
              <Clock className="size-3" />
              {t("topCandidate")}
            </div>
            <span className="text-sm font-bold text-foreground truncate block">
              {analysis.topCandidate?.activity ?? "—"}
            </span>
          </CardContent>
        </Card>
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as "cards" | "matrix")} className="w-full">
        <TabsList className="w-fit">
          <TabsTrigger value="cards" className="text-xs flex items-center gap-1.5">
            <BarChart3 className="size-3.5" />
            {t("cardsView")}
          </TabsTrigger>
          <TabsTrigger value="matrix" className="text-xs flex items-center gap-1.5">
            <Table2 className="size-3.5" />
            {t("matrixView")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cards" className="mt-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {analysis.candidates.map((candidate, idx) => (
              <AutomationScoreCard
                key={candidate.id}
                candidate={candidate}
                rank={idx + 1}
                unit={unit}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="matrix" className="mt-3">
          <AutomationMatrixTable candidates={analysis.candidates} unit={unit} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
