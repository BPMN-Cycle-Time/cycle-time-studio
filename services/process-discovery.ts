// Process Discovery Service: Discovers BPMN 2.0 process models from Event Logs.

import { layoutProcess } from "bpmn-auto-layout";
import type { EventLogItem } from "@/types";

let idCounter = 0;
function freshId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${idCounter}_${Math.random().toString(36).slice(2, 7)}`;
}

function escapeXml(s: string): string {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface DiscoveredProcessResult {
  bpmnXml: string;
  activitiesCount: number;
  transitionsCount: number;
  startActivities: string[];
  endActivities: string[];
}

/**
 * Discovers a process model from event log traces and produces layouted BPMN 2.0 XML.
 */
export async function discoverBpmnFromEventLog(
  events: EventLogItem[],
  processName = "Discovered As-Is Process",
): Promise<DiscoveredProcessResult> {
  if (!events.length) {
    const emptyXml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  id="Definitions_1" targetNamespace="http://cycletime.studio/bpmn">
  <bpmn:process id="Process_1" name="${escapeXml(processName)}" isExecutable="false">
    <bpmn:startEvent id="Start_1" name="Start" />
    <bpmn:endEvent id="End_1" name="End" />
    <bpmn:sequenceFlow id="Flow_1" sourceRef="Start_1" targetRef="End_1" />
  </bpmn:process>
</bpmn:definitions>`;
    return {
      bpmnXml: await layoutProcess(emptyXml),
      activitiesCount: 0,
      transitionsCount: 0,
      startActivities: [],
      endActivities: [],
    };
  }

  // 1. Group events by case and sort chronologically
  const caseMap = new Map<string, EventLogItem[]>();
  for (const e of events) {
    const list = caseMap.get(e.caseId) || [];
    list.push(e);
    caseMap.set(e.caseId, list);
  }

  // 2. Discover activities, start activities, end activities, and transitions
  const allActivities = new Set<string>();
  const startActivitiesMap = new Map<string, number>();
  const endActivitiesMap = new Map<string, number>();
  const transitionFrequencies = new Map<string, number>(); // "actA|||actB" -> count

  for (const [, trace] of caseMap.entries()) {
    trace.sort(
      (a, b) => new Date(a.startTimestamp).getTime() - new Date(b.startTimestamp).getTime(),
    );
    if (trace.length === 0) continue;

    const firstAct = trace[0]!.activity;
    startActivitiesMap.set(firstAct, (startActivitiesMap.get(firstAct) || 0) + 1);

    const lastAct = trace[trace.length - 1]!.activity;
    endActivitiesMap.set(lastAct, (endActivitiesMap.get(lastAct) || 0) + 1);

    for (let i = 0; i < trace.length; i++) {
      allActivities.add(trace[i]!.activity);

      if (i < trace.length - 1) {
        const from = trace[i]!.activity;
        const to = trace[i + 1]!.activity;
        const key = `${from}|||${to}`;
        transitionFrequencies.set(key, (transitionFrequencies.get(key) || 0) + 1);
      }
    }
  }

  // 3. Construct BPMN Nodes & Flows
  const actIdMap = new Map<string, string>();
  for (const act of allActivities) {
    actIdMap.set(act, freshId("Task"));
  }

  const startId = freshId("StartEvent");
  const endId = freshId("EndEvent");

  const nodesXml: string[] = [];
  const flowsXml: string[] = [];

  // Start Node
  nodesXml.push(`<bpmn:startEvent id="${startId}" name="Start" />`);

  // Activity Tasks
  for (const [act, id] of actIdMap.entries()) {
    nodesXml.push(`<bpmn:task id="${id}" name="${escapeXml(act)}" />`);
  }

  // End Node
  nodesXml.push(`<bpmn:endEvent id="${endId}" name="End" />`);

  // Flows: Start -> First Activities
  for (const [startAct, count] of startActivitiesMap.entries()) {
    const targetId = actIdMap.get(startAct);
    if (targetId) {
      const flowId = freshId("Flow_start");
      const label = count > 1 ? `${count}` : "";
      const nameAttr = label ? ` name="${label}"` : "";
      flowsXml.push(
        `<bpmn:sequenceFlow id="${flowId}"${nameAttr} sourceRef="${startId}" targetRef="${targetId}" />`,
      );
    }
  }

  // Flows: Transitions between Activities
  for (const [key, count] of transitionFrequencies.entries()) {
    const [fromAct, toAct] = key.split("|||");
    const sourceId = actIdMap.get(fromAct!);
    const targetId = actIdMap.get(toAct!);

    if (sourceId && targetId) {
      const flowId = freshId("Flow_trans");
      const nameAttr = count > 1 ? ` name="${count}"` : "";
      flowsXml.push(
        `<bpmn:sequenceFlow id="${flowId}"${nameAttr} sourceRef="${sourceId}" targetRef="${targetId}" />`,
      );
    }
  }

  // Flows: End Activities -> End Node
  for (const [endAct, count] of endActivitiesMap.entries()) {
    const sourceId = actIdMap.get(endAct);
    if (sourceId) {
      const flowId = freshId("Flow_end");
      const label = count > 1 ? `${count}` : "";
      const nameAttr = label ? ` name="${label}"` : "";
      flowsXml.push(
        `<bpmn:sequenceFlow id="${flowId}"${nameAttr} sourceRef="${sourceId}" targetRef="${endId}" />`,
      );
    }
  }

  // 4. Assemble semantic XML
  const semanticXml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  id="Definitions_1" targetNamespace="http://cycletime.studio/bpmn">
  <bpmn:process id="Process_1" name="${escapeXml(processName)}" isExecutable="false">
    ${nodesXml.join("\n    ")}
    ${flowsXml.join("\n    ")}
  </bpmn:process>
</bpmn:definitions>`;

  // 5. Auto layout into complete BPMN 2.0 XML with DI coordinates
  let bpmnXml = semanticXml;
  try {
    bpmnXml = await layoutProcess(semanticXml);
  } catch (err) {
    console.warn("bpmn-auto-layout failed, returning semantic XML:", err);
  }

  return {
    bpmnXml,
    activitiesCount: allActivities.size,
    transitionsCount: transitionFrequencies.size,
    startActivities: Array.from(startActivitiesMap.keys()),
    endActivities: Array.from(endActivitiesMap.keys()),
  };
}
