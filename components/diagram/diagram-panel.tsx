"use client";

import type { Block } from "@/types";
import { useEditorStore } from "@/store/useEditorStore";
import { ProcessModelPanel } from "./process-model";
import { GraphPanel } from "./graph";
import { BpmnPanel } from "./bpmn";
import { EventLogPanel } from "./event-log";
import { SocialNetworkPanel } from "./social-network";
import type { DiagramTab } from "@/components/layout";

interface DiagramPanelProps {
  blocks: Block[];
  unit: string;
  activeTab: DiagramTab;
}

export function DiagramPanel({ blocks, unit, activeTab }: DiagramPanelProps) {
  const tasks = useEditorStore((s) => s.project?.tasks);
  const currency = useEditorStore((s) => s.project?.currency);

  return (
    <div className="w-full flex-1 flex flex-col min-h-0">
      {activeTab === "model" && <ProcessModelPanel blocks={blocks} tasks={tasks} unit={unit} />}
      {activeTab === "graph" && <GraphPanel blocks={blocks} tasks={tasks} />}
      {activeTab === "bpmn" && <BpmnPanel blocks={blocks} tasks={tasks} unit={unit} />}
      {activeTab === "eventLog" && (
        <EventLogPanel blocks={blocks} tasks={tasks} unit={unit} currency={currency} />
      )}
      {activeTab === "socialNetwork" && (
        <SocialNetworkPanel blocks={blocks} tasks={tasks} unit={unit} />
      )}
    </div>
  );
}
