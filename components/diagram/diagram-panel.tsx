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

  const tabs = [
    {
      value: "model",
      label: t("processModelTab"),
      content: <ProcessModelPanel blocks={blocks} tasks={tasks} unit={unit} />,
    },
    {
      value: "graph",
      label: t("graphTab"),
      content: <GraphPanel blocks={blocks} tasks={tasks} />,
    },
    {
      value: "bpmn",
      label: t("bpmnTab"),
      content: (
        <BpmnPanel blocks={blocks} tasks={tasks} unit={unit} onApplyBlocks={onApplyBlocks} />
      ),
    },
  ];

  return (
    <Tabs defaultValue="model" className="flex-1 flex flex-col min-h-0">
      <TabsList className="shrink-0 self-start">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent
          key={tab.value}
          value={tab.value}
          className="flex-1 flex flex-col min-h-0 mt-2"
        >
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
