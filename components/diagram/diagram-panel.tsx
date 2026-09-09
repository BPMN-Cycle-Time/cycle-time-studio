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
  onTabChange?: (tab: DiagramTab) => void;
}

export function DiagramPanel({ blocks, unit, activeTab, onTabChange }: DiagramPanelProps) {
  const tasks = useEditorStore((s) => s.project?.tasks);
  const currency = useEditorStore((s) => s.project?.currency);
  const uploadedEvents = useEditorStore((s) => s.project?.uploadedEvents ?? null);
  const eventLogDataSource = useEditorStore(
    (s) =>
      s.project?.eventLogDataSource ??
      (s.project?.uploadedEvents && s.project.uploadedEvents.length > 0 ? "imported" : "simulated"),
  );
  const setUploadedEvents = useEditorStore((s) => s.setUploadedEvents);
  const setEventLogDataSource = useEditorStore((s) => s.setEventLogDataSource);

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
          dataSource={eventLogDataSource}
          onUploadEvents={setUploadedEvents}
          onDataSourceChange={setEventLogDataSource}
          onSwitchDiagramTab={onTabChange}
        />
      )}
      {activeTab === "socialNetwork" && (
        <SocialNetworkPanel
          blocks={blocks}
          tasks={tasks}
          unit={unit}
          uploadedEvents={uploadedEvents}
          dataSource={eventLogDataSource}
          onUploadEvents={setUploadedEvents}
          onDataSourceChange={setEventLogDataSource}
        />
      )}
    </div>
  );
}
