"use client";

import { useTranslations } from "next-intl";
import { Info, Sparkles } from "lucide-react";
import type { SocialNetworkNode, SocialNetworkEdge } from "@/types";
import { AppCard, Badge, Button } from "@/components/ui";

interface SocialNodeInspectorProps {
  selectedNode: SocialNetworkNode | null;
  onClearSelection: () => void;
  mostActiveNode: SocialNetworkNode | null;
  topEdge: SocialNetworkEdge | null;
  totalNodes: number;
}

export function SocialNodeInspector({
  selectedNode,
  onClearSelection,
  mostActiveNode,
  topEdge,
  totalNodes,
}: SocialNodeInspectorProps) {
  const tDiag = useTranslations("diagram");

  return (
    <AppCard className="lg:col-span-4 p-4 bg-card/80 flex flex-col shadow-xs border-border/70">
      {selectedNode ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-3.5 h-3.5 rounded-full shrink-0"
                style={{ backgroundColor: selectedNode.color }}
              />
              <h4 className="font-semibold text-sm text-foreground truncate">
                {selectedNode.label}
              </h4>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className="text-xs">
                {selectedNode.activityCount} {tDiag("activitiesDone")}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearSelection}
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                {tDiag("deselectNode")}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50">
              <span className="text-muted-foreground block mb-0.5">{tDiag("handoversSent")}</span>
              <span className="font-bold text-foreground text-sm font-mono">
                {selectedNode.handoversSent}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50">
              <span className="text-muted-foreground block mb-0.5">
                {tDiag("handoversReceived")}
              </span>
              <span className="font-bold text-foreground text-sm font-mono">
                {selectedNode.handoversReceived}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              {tDiag("networkInsights")}
            </span>
            <Badge variant="secondary" className="text-[11px] font-mono">
              {totalNodes} {tDiag("nodeCount")}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-muted/30 border border-border/40">
              <span className="text-[11px] text-muted-foreground block mb-0.5">
                {tDiag("mostActive")}
              </span>
              <span className="font-semibold text-foreground truncate block text-xs">
                {mostActiveNode?.label ?? "—"}
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                {mostActiveNode?.activityCount ?? 0} {tDiag("activitiesDone")}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-muted/30 border border-border/40">
              <span className="text-[11px] text-muted-foreground block mb-0.5">
                {tDiag("topConnection")}
              </span>
              <span className="font-semibold text-foreground truncate block text-xs">
                {topEdge ? `${topEdge.source} → ${topEdge.target}` : "—"}
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                {topEdge?.weight ?? 0} {tDiag("interactionCount").toLowerCase()}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-muted-foreground/80 pt-1">
            <Info className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>{tDiag("clickNodeHint")}</span>
          </div>
        </div>
      )}
    </AppCard>
  );
}
