"use client";

import { useTranslations } from "next-intl";
import { GitCompare, Share2, ShieldAlert } from "lucide-react";

import type { Block, EventLogItem, Task } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";
import { Node2VecView } from "./node2vec-view";
import { AnomalyView } from "./anomaly-view";
import { ModelCompareView } from "./model-compare-view";

interface EmbeddingPanelProps {
  blocks: Block[];
  tasks?: Task[];
  uploadedEvents?: EventLogItem[] | null;
}

/** Graph Embedding tab: Node2Vec, Graph2Vec log anomalies and WL-kernel model comparison. */
export function EmbeddingPanel({ blocks, tasks, uploadedEvents }: EmbeddingPanelProps) {
  const t = useTranslations("diagram.embedding");
  const events = uploadedEvents ?? [];
  // Sub-tabs stay mounted (hidden when inactive) so results survive switching tabs.
  const contentClass = "mt-3 data-[state=inactive]:hidden";

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 gap-4 p-4 overflow-y-auto no-scrollbar">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-bold text-foreground tracking-tight">{t("title")}</h2>
        <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Tabs defaultValue="node2vec" className="w-full">
        <TabsList className="w-fit">
          <TabsTrigger value="node2vec" className="text-xs flex items-center gap-1.5">
            <Share2 className="size-3.5" />
            {t("tabs.node2vec")}
          </TabsTrigger>
          <TabsTrigger value="anomaly" className="text-xs flex items-center gap-1.5">
            <ShieldAlert className="size-3.5" />
            {t("tabs.anomaly")}
          </TabsTrigger>
          <TabsTrigger value="compare" className="text-xs flex items-center gap-1.5">
            <GitCompare className="size-3.5" />
            {t("tabs.compare")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="node2vec" forceMount className={contentClass}>
          <Node2VecView blocks={blocks} tasks={tasks} events={events} />
        </TabsContent>
        <TabsContent value="anomaly" forceMount className={contentClass}>
          {events.length ? (
            <AnomalyView blocks={blocks} tasks={tasks} events={events} />
          ) : (
            <p className="text-sm text-muted-foreground py-10 text-center">
              {t("anomaly.needsLog")}
            </p>
          )}
        </TabsContent>
        <TabsContent value="compare" forceMount className={contentClass}>
          <ModelCompareView blocks={blocks} tasks={tasks} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
