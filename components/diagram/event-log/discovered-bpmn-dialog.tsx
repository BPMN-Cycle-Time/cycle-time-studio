"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  Download,
  Copy,
  Check,
  GitFork,
  Sparkles,
  Loader2,
  Workflow,
  ArrowUpRight,
} from "lucide-react";
import type { EventLogItem } from "@/types";
import type { DiagramTab } from "@/components/layout";
import { useEditorStore } from "@/store/useEditorStore";
import { bpmnXmlToBlocks } from "@/utils";
import {
  discoverBpmnFromEventLog,
  type DiscoveredProcessResult,
} from "@/services/process-discovery";
import {
  Button,
  Badge,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui";

interface DiscoveredBpmnDialogProps {
  events: EventLogItem[];
  trigger?: React.ReactNode;
  onSwitchDiagramTab?: (tab: DiagramTab) => void;
}

export function DiscoveredBpmnDialog({
  events,
  trigger,
  onSwitchDiagramTab,
}: DiscoveredBpmnDialogProps) {
  const tDiag = useTranslations("diagram");

  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<DiscoveredProcessResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && events.length > 0) {
      startTransition(async () => {
        const res = await discoverBpmnFromEventLog(events, "Discovered As-Is Process");
        setResult(res);
      });
    }
  };

  const handleCopyXml = async () => {
    if (!result?.bpmnXml) return;
    await navigator.clipboard.writeText(result.bpmnXml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadBpmn = () => {
    if (!result?.bpmnXml) return;
    const blob = new Blob([result.bpmnXml], { type: "application/xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "discovered-as-is-process.bpmn";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleApplyToModel = async (targetTab: DiagramTab = "bpmn") => {
    if (!result?.bpmnXml) return;
    setApplying(true);
    try {
      if (result.blocks && result.blocks.length > 0 && result.tasks && result.tasks.length > 0) {
        useEditorStore.getState().importBlocksAndTasks(result.blocks, result.tasks, result.bpmnXml);
      } else {
        const existingTasks = useEditorStore.getState().project?.tasks;
        const parsed = await bpmnXmlToBlocks(result.bpmnXml, existingTasks);
        useEditorStore.getState().importBlocksAndTasks(parsed.blocks, parsed.tasks, result.bpmnXml);
      }
      onSwitchDiagramTab?.(targetTab);
      setOpen(false);
    } catch {
      useEditorStore.getState().setBpmnXml(result.bpmnXml);
      onSwitchDiagramTab?.(targetTab);
      setOpen(false);
    } finally {
      setApplying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="outline"
            size="sm"
            disabled={events.length === 0}
            className="text-xs flex items-center gap-1.5 text-primary border-primary/30 hover:bg-primary/10"
          >
            <GitFork className="w-3.5 h-3.5" />
            {tDiag("generateDiscoveredBpmn")}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-2xl min-w-0 overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-4 h-4 text-primary shrink-0" />
            <span>{tDiag("discoveredBpmnTitle")}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {tDiag("discoveredBpmnDesc")}
          </DialogDescription>
        </DialogHeader>

        {isPending ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-xs">{tDiag("discoveringProcess")}</p>
          </div>
        ) : result ? (
          <div className="space-y-4 py-2 min-w-0 overflow-hidden">
            {/* Stats Summary */}
            <div className="grid grid-cols-3 gap-2.5 min-w-0">
              <div className="p-3 rounded-lg bg-card border border-border/70 min-w-0">
                <span className="text-muted-foreground text-[11px] block mb-0.5 truncate">
                  {tDiag("distinctActivities")}
                </span>
                <span className="text-lg font-bold font-mono text-foreground">
                  {result.activitiesCount}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-card border border-border/70 min-w-0">
                <span className="text-muted-foreground text-[11px] block mb-0.5 truncate">
                  {tDiag("discoveredTransitions")}
                </span>
                <span className="text-lg font-bold font-mono text-foreground">
                  {result.transitionsCount}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-card border border-border/70 min-w-0">
                <span className="text-muted-foreground text-[11px] block mb-0.5 truncate">
                  {tDiag("totalCases")}
                </span>
                <span className="text-lg font-bold font-mono text-foreground">
                  {new Set(events.map((e) => e.caseId)).size}
                </span>
              </div>
            </div>

            {/* XML Preview */}
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">
                  {tDiag("bpmn2XmlStandard")}
                </span>
                <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                  BPMN 2.0 + Auto-Layout DI
                </Badge>
              </div>
              <div className="relative min-w-0 w-full overflow-hidden rounded-lg">
                <pre className="max-h-56 w-full min-w-0 overflow-auto whitespace-pre-wrap break-all p-3 rounded-lg border border-border/70 bg-muted/40 font-mono text-[11px] text-muted-foreground leading-relaxed">
                  {result.bpmnXml.slice(0, 1500)}
                  {result.bpmnXml.length > 1500 && "\n\n... (truncated for preview)"}
                </pre>
              </div>
            </div>
          </div>
        ) : null}

        <DialogFooter className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)} className="text-xs">
            {tDiag("cancel")}
          </Button>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyXml}
              disabled={!result?.bpmnXml}
              className="text-xs flex items-center gap-1.5"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              {copied ? tDiag("copied") : tDiag("copyXml")}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadBpmn}
              disabled={!result?.bpmnXml}
              className="text-xs flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              {tDiag("downloadBpmnFile")}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleApplyToModel("model")}
              disabled={!result?.bpmnXml || applying}
              className="text-xs flex items-center gap-1.5"
              title={tDiag("applyToProcessModel")}
            >
              <Workflow className="w-3.5 h-3.5 text-primary" />
              <span>{tDiag("applyToProcessModel")}</span>
            </Button>

            <Button
              size="sm"
              onClick={() => handleApplyToModel("bpmn")}
              disabled={!result?.bpmnXml || applying}
              className="text-xs flex items-center gap-1.5 bg-primary text-primary-foreground font-medium shadow-xs hover:bg-primary/90"
            >
              {applying ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>{tDiag("applyToBpmnDiagram")}</span>
              <ArrowUpRight className="w-3.5 h-3.5 opacity-70" />
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
