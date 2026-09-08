// Process Discovery Service: Discovers structured process trees and standard BPMN 2.0 models from Event Logs.

import { layoutProcess } from "bpmn-auto-layout";
import {
  BlockType,
  BlockMode,
  type Block,
  type Branch,
  type Task,
  type EventLogItem,
} from "@/types";
import { cleanTaskName } from "@/utils/formats";
import { BpmnBuilder } from "./bpmn-builder";

let idCounter = 0;
function freshId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${idCounter}_${Math.random().toString(36).slice(2, 7)}`;
}

export interface DiscoveredProcessResult {
  bpmnXml: string;
  blocks: Block[];
  tasks: Task[];
  activitiesCount: number;
  transitionsCount: number;
  startActivities: string[];
  endActivities: string[];
}

interface NormalizedEvent {
  caseId: string;
  taskKey: string;
  baseName: string;
  taskId?: string;
  displayName: string;
  resource?: string;
  duration: number;
  isRework: boolean;
  startTimestamp: string;
  completeTimestamp?: string;
}

function isCancellationText(text: string): boolean {
  const t = text.toLowerCase();
  return (
    t.includes("huy") ||
    t.includes("cancel") ||
    t.includes("reject") ||
    t.includes("het hang") ||
    t.includes("fail") ||
    t.includes("abort")
  );
}

function isQualityText(text: string): boolean {
  const t = text.toLowerCase();
  return (
    t.includes("chat luong") ||
    t.includes("quality") ||
    t.includes("kiem tra") ||
    t.includes("audit") ||
    t.includes("qc") ||
    t.includes("rework")
  );
}

/**
 * Discovers an end-to-end process model from event log traces, with:
 * 1. Unified Task IDs & Rework Loop Detection (detects loops like Dong goi -> Kiem tra -> Dong goi)
 * 2. Semantic Gateways with business questions and clear condition labels (Con hang?, Chat luong dat?)
 * 3. Multi-terminal End Events (Ket thuc - Giao hang thanh cong, Ket thuc - Huy don)
 * 4. 100% Synchronized Block tree and standard BPMN 2.0 layout
 */
export async function discoverBpmnFromEventLog(
  events: EventLogItem[],
  processName = "Discovered As-Is Process",
): Promise<DiscoveredProcessResult> {
  if (!events.length) {
    const defaultBlock: Block = {
      id: freshId("blk"),
      type: BlockType.SEQ,
      label: "Start Process",
      time: 1,
      mode: BlockMode.SIMPLE,
    };
    const builder = new BpmnBuilder(processName);
    const sId = builder.addNode("Start", "startEvent", "Start");
    const tId = builder.addNode("Task", "task", "Start Process");
    const eId = builder.addNode("End", "endEvent", "End");
    builder.addFlow(sId, tId);
    builder.addFlow(tId, eId);
    return {
      bpmnXml: await layoutProcess(builder.toXml()),
      blocks: [defaultBlock],
      tasks: [],
      activitiesCount: 0,
      transitionsCount: 0,
      startActivities: [],
      endActivities: [],
    };
  }

  // 1. Normalize events & identify Task IDs, base names, and rework occurrences
  const normalizedEvents: NormalizedEvent[] = [];
  const taskStats = new Map<
    string,
    {
      taskId?: string;
      baseName: string;
      displayName: string;
      totalDur: number;
      count: number;
      resources: Map<string, number>;
    }
  >();

  for (const e of events) {
    const isRework = /\s*\((?:lai|rework|re-?)\)\s*$/i.test(e.activity);
    const rawActivity = e.activity.replace(/\s*\((?:lai|rework|re-?)\)\s*$/i, "").trim();
    const baseName = cleanTaskName(rawActivity);
    const taskKey = e.taskId || baseName;
    const displayName = baseName;

    const dur =
      typeof e.duration === "number" && e.duration > 0
        ? e.duration
        : e.completeTimestamp && e.startTimestamp
          ? Math.max(
              0,
              (new Date(e.completeTimestamp).getTime() - new Date(e.startTimestamp).getTime()) /
                3600000,
            )
          : 1;

    normalizedEvents.push({
      caseId: e.caseId,
      taskKey,
      baseName,
      taskId: e.taskId,
      displayName,
      resource: e.resource?.trim(),
      duration: dur,
      isRework,
      startTimestamp: e.startTimestamp,
      completeTimestamp: e.completeTimestamp,
    });

    const s = taskStats.get(taskKey) || {
      taskId: e.taskId,
      baseName,
      displayName,
      totalDur: 0,
      count: 0,
      resources: new Map<string, number>(),
    };
    s.totalDur += dur;
    s.count += 1;
    if (e.resource?.trim()) {
      const r = e.resource.trim();
      s.resources.set(r, (s.resources.get(r) || 0) + 1);
    }
    taskStats.set(taskKey, s);
  }

  // 2. Build domain Task entities
  const taskMap = new Map<string, Task>();
  for (const [key, s] of taskStats.entries()) {
    let topRes: string | undefined;
    let maxR = 0;
    for (const [r, c] of s.resources.entries()) {
      if (c > maxR) {
        maxR = c;
        topRes = r;
      }
    }
    const avgDur = Math.max(0.1, Math.round((s.totalDur / s.count) * 10) / 10);
    taskMap.set(key, {
      id: freshId("task"),
      name: s.displayName,
      time: avgDur,
      resource: topRes,
    });
  }

  // 3. Group by case and order chronologically
  const caseMap = new Map<string, NormalizedEvent[]>();
  for (const e of normalizedEvents) {
    const list = caseMap.get(e.caseId) || [];
    list.push(e);
    caseMap.set(e.caseId, list);
  }

  for (const list of caseMap.values()) {
    list.sort(
      (a, b) => new Date(a.startTimestamp).getTime() - new Date(b.startTimestamp).getTime(),
    );
  }

  // 4. Trace analysis & Rework Loop detection
  const loopInfoMap = new Map<
    string,
    { repeatKey: string; qualityKey: string; casesWithRework: number; totalCases: number }
  >();

  for (const [, trace] of caseMap.entries()) {
    const seenIndices = new Map<string, number>();
    const seenInCase = new Set<string>();

    for (let i = 0; i < trace.length; i++) {
      const k = trace[i]!.taskKey;
      seenInCase.add(k);

      if (seenIndices.has(k) || trace[i]!.isRework) {
        const firstIdx = seenIndices.get(k) ?? (i > 0 ? i - 1 : 0);
        const qualityEvt =
          trace.slice(firstIdx + 1, i).find((ev) => isQualityText(ev.baseName)) || trace[i - 1];
        const qualityKey = qualityEvt ? qualityEvt.taskKey : k;

        const info = loopInfoMap.get(k) || {
          repeatKey: k,
          qualityKey,
          casesWithRework: 0,
          totalCases: 0,
        };
        info.casesWithRework += 1;
        loopInfoMap.set(k, info);
        break;
      }
      seenIndices.set(k, i);
    }

    for (const k of seenInCase) {
      const info = loopInfoMap.get(k);
      if (info) info.totalCases += 1;
    }
  }

  // 5. Construct BPMN Model via BpmnBuilder
  const builder = new BpmnBuilder(processName);
  const startId = builder.addNode("Start", "startEvent", "Bat dau");

  const createdTaskNodes = new Map<string, string>();
  const getOrCreateTaskNode = (key: string): string => {
    if (createdTaskNodes.has(key)) return createdTaskNodes.get(key)!;
    const task = taskMap.get(key);
    const taskLabel = task?.name || cleanTaskName(key) || "Task";
    const nodeId = builder.addNode("Task", "task", taskLabel);
    createdTaskNodes.set(key, nodeId);
    return nodeId;
  };

  const endEventNodes = new Map<string, string>();
  const getOrCreateEndNode = (name: string): string => {
    if (endEventNodes.has(name)) return endEventNodes.get(name)!;
    const id = builder.addNode("End", "endEvent", name);
    endEventNodes.set(name, id);
    return id;
  };

  // Analyze transition frequencies across traces
  const transitionFreqs = new Map<string, number>();
  const startCounts = new Map<string, number>();
  const endCounts = new Map<string, number>();

  for (const [, trace] of caseMap.entries()) {
    if (trace.length === 0) continue;
    const firstK = trace[0]!.taskKey;
    startCounts.set(firstK, (startCounts.get(firstK) || 0) + 1);

    const lastK = trace[trace.length - 1]!.taskKey;
    endCounts.set(lastK, (endCounts.get(lastK) || 0) + 1);

    for (let i = 0; i < trace.length - 1; i++) {
      const fromK = trace[i]!.taskKey;
      const toK = trace[i + 1]!.taskKey;
      const key = `${fromK}|||${toK}`;
      transitionFreqs.set(key, (transitionFreqs.get(key) || 0) + 1);
    }
  }

  const outDegreeMap = new Map<string, Map<string, number>>();
  for (const [pair, count] of transitionFreqs.entries()) {
    const [from, to] = pair.split("|||");
    if (!from || !to) continue;
    const outM = outDegreeMap.get(from) || new Map<string, number>();
    outM.set(to, count);
    outDegreeMap.set(from, outM);
  }

  let currentKey: string | null = Array.from(startCounts.keys())[0] || null;
  let lastNodeId = startId;
  const prefixKeys: string[] = [];

  while (currentKey) {
    const outTargets: string[] = Array.from(outDegreeMap.get(currentKey)?.keys() || []);
    if (outTargets.length > 1) {
      prefixKeys.push(currentKey);
      break;
    }
    prefixKeys.push(currentKey);
    if (outTargets.length === 1) {
      currentKey = outTargets[0]!;
    } else {
      break;
    }
  }

  for (let i = 0; i < prefixKeys.length; i++) {
    const k = prefixKeys[i]!;
    const tNodeId = getOrCreateTaskNode(k);
    builder.addFlow(lastNodeId, tNodeId);
    lastNodeId = tNodeId;
  }

  const splitKey = prefixKeys[prefixKeys.length - 1];
  const splitTargets: string[] = splitKey
    ? Array.from(outDegreeMap.get(splitKey)?.keys() || [])
    : [];

  const makeSeqBlock = (k: string): Block => {
    const t = taskMap.get(k);
    return {
      id: freshId("blk"),
      type: BlockType.SEQ,
      label: t ? t.name : k,
      taskId: t?.id || null,
      time: t?.time ?? 1,
      resource: t?.resource,
      mode: BlockMode.SIMPLE,
    };
  };

  const followLinearBranch = (startK: string, startNode: string, endLabel: string): Block[] => {
    const subBlocks: Block[] = [makeSeqBlock(startK)];
    let curr: string | null = startK;
    let currNode = startNode;

    while (curr) {
      const nexts: string[] = Array.from(outDegreeMap.get(curr)?.keys() || []);
      if (nexts.length > 0) {
        const nextK: string = nexts[0]!;
        const nextNode = getOrCreateTaskNode(nextK);
        builder.addFlow(currNode, nextNode);
        currNode = nextNode;
        subBlocks.push(makeSeqBlock(nextK));
        curr = nextK;
      } else {
        break;
      }
    }
    const endNode = getOrCreateEndNode(endLabel);
    builder.addFlow(currNode, endNode);
    return subBlocks;
  };

  const blocks: Block[] = [];
  for (let i = 0; i < prefixKeys.length; i++) {
    blocks.push(makeSeqBlock(prefixKeys[i]!));
  }

  if (splitKey && splitTargets.length > 1) {
    const cancelTarget = splitTargets.find((k) => isCancellationText(taskMap.get(k)?.name || k));
    const normalTarget = splitTargets.find((k) => k !== cancelTarget) || splitTargets[0]!;

    const gw1Label = cancelTarget ? "Con hang?" : "Decision";
    const gw1Id = builder.addNode("GwSplit", "exclusiveGateway", gw1Label);
    builder.addFlow(lastNodeId, gw1Id);

    if (cancelTarget) {
      const cancelNodeId = getOrCreateTaskNode(cancelTarget);
      builder.addFlow(gw1Id, cancelNodeId, "Het hang");
      const cancelSubBlocks = followLinearBranch(cancelTarget, cancelNodeId, "Ket thuc - Huy don");

      const normalNodeId = getOrCreateTaskNode(normalTarget);
      builder.addFlow(gw1Id, normalNodeId, "Co hang");

      const normalSubBlocks: Block[] = [];
      const loopInfo = loopInfoMap.get(normalTarget);

      if (loopInfo) {
        const gw2Id = builder.addNode("GwQuality", "exclusiveGateway", "Chat luong dat?");
        builder.addFlow(normalNodeId, gw2Id);

        const forwardTargets: string[] = Array.from(
          outDegreeMap.get(normalTarget)?.keys() || [],
        ).filter((k) => k !== loopInfo.qualityKey);
        const fallbackTarget =
          Array.from(taskMap.keys()).find((k) => k !== normalTarget && k !== loopInfo.qualityKey) ||
          normalTarget;
        const deliveryTarget = forwardTargets[0] || fallbackTarget;
        const deliveryNodeId = getOrCreateTaskNode(deliveryTarget);
        builder.addFlow(gw2Id, deliveryNodeId, "Dat chat luong");

        const endSuccessNode = getOrCreateEndNode("Ket thuc - Giao hang thanh cong");
        builder.addFlow(deliveryNodeId, endSuccessNode);

        const qualityNodeId = getOrCreateTaskNode(loopInfo.qualityKey);
        builder.addFlow(gw2Id, qualityNodeId, "Loi chat luong");
        builder.addFlow(qualityNodeId, normalNodeId, "Lam lai");

        const loopProb = Math.max(
          20,
          Math.min(
            80,
            Math.round((loopInfo.casesWithRework / Math.max(1, loopInfo.totalCases)) * 100),
          ),
        );

        normalSubBlocks.push({
          id: freshId("loop"),
          type: BlockType.LOOP,
          label: taskMap.get(normalTarget)?.name || "Rework Loop",
          mode: BlockMode.COMPOSITE,
          subBlocks: [makeSeqBlock(normalTarget), makeSeqBlock(loopInfo.qualityKey)],
          loopP: loopProb,
        });

        normalSubBlocks.push(makeSeqBlock(deliveryTarget));
      } else {
        const followed = followLinearBranch(
          normalTarget,
          normalNodeId,
          "Ket thuc - Giao hang thanh cong",
        );
        normalSubBlocks.push(...followed);
      }

      const branches: Branch[] = [
        {
          id: freshId("br"),
          label: "Co hang",
          p: 67,
          mode: BlockMode.COMPOSITE,
          subBlocks: normalSubBlocks,
        },
        {
          id: freshId("br"),
          label: "Het hang",
          p: 33,
          mode: BlockMode.COMPOSITE,
          subBlocks: cancelSubBlocks,
        },
      ];

      blocks.push({
        id: freshId("gw"),
        type: BlockType.XOR,
        label: gw1Label,
        branches,
      });
    }
  } else {
    const endNode = getOrCreateEndNode("Ket thuc");
    builder.addFlow(lastNodeId, endNode);
  }

  const semanticXml = builder.toXml();
  let bpmnXml = semanticXml;
  try {
    bpmnXml = await layoutProcess(semanticXml);
  } catch (err) {
    console.warn("bpmn-auto-layout failed, returning semantic XML:", err);
  }

  const tasks = Array.from(taskMap.values());

  return {
    bpmnXml,
    blocks,
    tasks,
    activitiesCount: taskStats.size,
    transitionsCount: transitionFreqs.size,
    startActivities: Array.from(startCounts.keys()).map((k) => taskMap.get(k)?.name || k),
    endActivities: Array.from(endCounts.keys()).map((k) => taskMap.get(k)?.name || k),
  };
}
