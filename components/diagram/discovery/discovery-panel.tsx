"use client";

import { useState, useTransition, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Sparkles, Loader2, Workflow, GitBranch } from "lucide-react";

import type {
  Block,
  EventLogItem,
  EventLogDataSource,
  HeuristicsMinerOptions,
  Task,
} from "@/types";
import { useEditorStore } from "@/store/useEditorStore";
import { generateEventLog } from "@/services/event-log";
import { discoverWithHeuristicsMiner } from "@/services/heuristics-miner";
import { Button, Card, CardContent, Badge } from "@/components/ui";
import type { DiagramTab } from "@/components/layout";

import { DfgCanvas } from "./dfg-canvas";
import { DiscoverySettings } from "./discovery-settings";

interface DiscoveryPanelProps {
  blocks: Block[];
  tasks?: Task[];
  unit: string;
  uploadedEvents?: EventLogItem[] | null;
  dataSource?: EventLogDataSource;
  onUploadEvents?: (events: EventLogItem[] | null) => void;
  onDataSourceChange?: (source: EventLogDataSource) => void;
  onSwitchDiagramTab?: (tab: DiagramTab) => void;
}

const DEFAULT_OPTIONS: HeuristicsMinerOptions = {
  frequencyThreshold: 2,
  dependencyThreshold: 0.4,
  loopThreshold: 0.3,
};

export function DiscoveryPanel({
  blocks,
  tasks,
  unit,
  uploadedEvents,
  dataSource = "simulated",
  onSwitchDiagramTab,
}: DiscoveryPanelProps) {
  const t = useTranslations("diagram");
  const importBlocksAndTasks = useEditorStore((s) => s.importBlocksAndTasks);
  const setBpmnXml = useEditorStore((s) => s.setBpmnXml);

  const [options, setOptions] = useState<HeuristicsMinerOptions>(DEFAULT_OPTIONS);
  const [result, setResult] = useState<Awaited<
    ReturnType<typeof discoverWithHeuristicsMiner>
  > | null>(null);
  const [isPending, startTransition] = useTransition();

  const hasUploadedFile = Boolean(uploadedEvents && uploadedEvents.length > 0);
  const isImportedActive = dataSource === "imported" && hasUploadedFile;

  const events = useMemo(() => {
    if (isImportedActive) return uploadedEvents as EventLogItem[];
    if (!blocks || blocks.length === 0) return [];
    return generateEventLog(blocks, tasks, unit, { caseCount: 100 });
  }, [isImportedActive, uploadedEvents, blocks, tasks, unit]);

  const handleRunDiscovery = () => {
    startTransition(async () => {
      const res = await discoverWithHeuristicsMiner(events, "Heuristics Discovery", options);
      setResult(res);
    });
  };

  const handleApply = (targetTab: DiagramTab = "model") => {
    if (!result) return;
    if (result.blocks.length > 0) {
      importBlocksAndTasks(result.blocks, result.tasks, result.bpmnXml);
    } else {
      setBpmnXml(result.bpmnXml);
    }
    onSwitchDiagramTab?.(targetTab);
  };

  if (events.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
        <div className="size-12 rounded-2xl bg-muted/60 flex items-center justify-center">
          <GitBranch className="size-6 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground text-sm max-w-xs">{t("noEventsForDiscovery")}</p>
      </div>
    );
  }

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 gap-5 p-4 overflow-y-auto no-scrollbar">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-bold text-foreground tracking-tight">{t("discoveryTitle")}</h2>
        <p className="text-xs text-muted-foreground">{t("discoveryDesc")}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">{t("discoverySettings")}</span>
              <Badge variant="outline" className="text-[10px]">
                {isImportedActive ? t("sourceUploadedFile") : t("sourceSimulatedBpmn")}
              </Badge>
            </div>

            <DiscoverySettings options={options} onChange={setOptions} />

            <Button
              size="sm"
              onClick={handleRunDiscovery}
              disabled={isPending}
              className="w-full text-xs flex items-center justify-center gap-1.5"
            >
              {isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              {t("runDiscovery")}
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 min-h-[320px]">
          <CardContent className="p-4 h-full flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-foreground">
                {t("directlyFollowsGraph")}
              </span>
              {result && (
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span>{result.activitiesCount} activities</span>
                  <span>·</span>
                  <span>{result.transitionsCount} transitions</span>
                </div>
              )}
            </div>
            <div className="flex-1 min-h-0 rounded-lg border border-border/70 bg-muted/30 overflow-hidden">
              {result ? (
                <DfgCanvas nodes={result.nodes} edges={result.edges} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                  <GitBranch className="w-6 h-6" />
                  <p className="text-xs">{t("runDiscoveryHint")}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {result && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleApply("model")}
            disabled={result.blocks.length === 0}
            className="text-xs flex items-center gap-1.5"
          >
            <Workflow className="w-3.5 h-3.5 text-primary" />
            {t("applyToProcessModel")}
          </Button>
          <Button
            size="sm"
            onClick={() => handleApply("bpmn")}
            disabled={!result.bpmnXml}
            className="text-xs flex items-center gap-1.5 bg-primary text-primary-foreground"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {t("applyToBpmnDiagram")}
          </Button>
        </div>
      )}
    </div>
  );
}
