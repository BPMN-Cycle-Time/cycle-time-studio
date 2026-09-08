"use client";

import { useState } from "react";
import type { Block, EventLogItem } from "@/types";
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
  onTabChange?: (tab: DiagramTab) => void;
}

export function DiagramPanel({ blocks, unit, activeTab, onTabChange }: DiagramPanelProps) {
  const tasks = useEditorStore((s) => s.project?.tasks);
  const currency = useEditorStore((s) => s.project?.currency);
  const [uploadedEvents, setUploadedEvents] = useState<EventLogItem[] | null>(null);

  return (
    <div className="w-full flex-1 flex flex-col min-h-0">
      {activeTab === "model" && <ProcessModelPanel blocks={blocks} tasks={tasks} unit={unit} />}
      {activeTab === "graph" && <GraphPanel blocks={blocks} tasks={tasks} />}
      {activeTab === "bpmn" && <BpmnPanel blocks={blocks} tasks={tasks} unit={unit} />}
      {activeTab === "eventLog" && (
        <EventLogPanel
          blocks={blocks}
          tasks={tasks}
          unit={unit}
          currency={currency}
          uploadedEvents={uploadedEvents}
          onUploadEvents={setUploadedEvents}
          onSwitchDiagramTab={onTabChange}
        />
      )}
      {activeTab === "socialNetwork" && (
        <SocialNetworkPanel
          blocks={blocks}
          tasks={tasks}
          unit={unit}
          uploadedEvents={uploadedEvents}
          onUploadEvents={setUploadedEvents}
        />
      )}
    </div>
  );
}
