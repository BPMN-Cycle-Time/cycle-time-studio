"use client";

import { useTranslations } from "next-intl";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui";
import type { Block } from "@/types";
import { useEditorStore } from "@/store/useEditorStore";
import { ProcessModelPanel } from "./process-model";
import { GraphPanel } from "./graph";
import { BpmnPanel } from "./bpmn";

export function DiagramPanel({
  blocks,
  unit,
  onApplyBlocks,
}: {
  blocks: Block[];
  unit: string;
  onApplyBlocks: (blocks: Block[]) => void;
}) {
  const t = useTranslations("diagram");
  const tasks = useEditorStore((s) => s.project?.tasks);

  return (
    <Tabs defaultValue="model" className="flex-1 flex flex-col min-h-0">
      <TabsList className="shrink-0 self-start">
        <TabsTrigger value="model">{t("processModelTab")}</TabsTrigger>
        <TabsTrigger value="graph">{t("graphTab")}</TabsTrigger>
        <TabsTrigger value="bpmn">{t("bpmnTab")}</TabsTrigger>
      </TabsList>
      <TabsContent value="model" className="flex-1 flex flex-col min-h-0 mt-2">
        <ProcessModelPanel blocks={blocks} tasks={tasks} unit={unit} />
      </TabsContent>
      <TabsContent value="graph" className="flex-1 flex flex-col min-h-0 mt-2">
        <GraphPanel blocks={blocks} tasks={tasks} />
      </TabsContent>
      <TabsContent value="bpmn" className="flex-1 flex flex-col min-h-0 mt-2">
        <BpmnPanel blocks={blocks} tasks={tasks} unit={unit} onApplyBlocks={onApplyBlocks} />
      </TabsContent>
    </Tabs>
  );
}
