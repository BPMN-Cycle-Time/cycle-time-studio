// Heuristics Miner: Discovers a process model from an Event Log using a Directly-Follows Graph (DFG).

import { layoutProcess } from "bpmn-auto-layout";
import { BlockType, BlockMode } from "@/types";
import type {
  Block,
  Branch,
  DfgEdge,
  DfgNode,
  EventLogItem,
  HeuristicsMinerOptions,
  HeuristicsMinerResult,
  Task,
} from "@/types";
import { cleanTaskName } from "@/utils/formats";
import { BpmnBuilder } from "./bpmn-builder";

const DEFAULT_OPTIONS: Required<HeuristicsMinerOptions> = {
  frequencyThreshold: 2,
  dependencyThreshold: 0.4,
  loopThreshold: 0.3,
};

let idCounter = 0;
function freshId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${idCounter}_${Math.random().toString(36).slice(2, 7)}`;
}

function resetIdCounter(): void {
  idCounter = 0;
}

interface TraceStats {
  directlyFollows: Map<string, number>;
  loops: Map<string, number>;
  starts: Map<string, number>;
  ends: Map<string, number>;
  activityFrequency: Map<string, number>;
  activityCases: Map<string, Set<string>>;
}

function buildTraceStats(events: EventLogItem[]): TraceStats {
  const directlyFollows = new Map<string, number>();
  const loops = new Map<string, number>();
  const starts = new Map<string, number>();
  const ends = new Map<string, number>();
  const activityFrequency = new Map<string, number>();
  const activityCases = new Map<string, Set<string>>();

  const caseMap = new Map<string, EventLogItem[]>();
  for (const e of events) {
    const list = caseMap.get(e.caseId) || [];
    list.push(e);
    caseMap.set(e.caseId, list);

    activityFrequency.set(e.activity, (activityFrequency.get(e.activity) || 0) + 1);
    const cases = activityCases.get(e.activity) || new Set<string>();
    cases.add(e.caseId);
    activityCases.set(e.activity, cases);
  }

  for (const [, caseEvents] of caseMap.entries()) {
    const sorted = [...caseEvents].sort(
      (a, b) => new Date(a.startTimestamp).getTime() - new Date(b.startTimestamp).getTime(),
    );

    if (sorted.length === 0) continue;

    const first = sorted[0]!;
    starts.set(first.activity, (starts.get(first.activity) || 0) + 1);

    const last = sorted[sorted.length - 1]!;
    ends.set(last.activity, (ends.get(last.activity) || 0) + 1);

    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i]!;
      const b = sorted[i + 1]!;
      const key = `${a.activity}->${b.activity}`;
      directlyFollows.set(key, (directlyFollows.get(key) || 0) + 1);

      // Detect backward loop edge: a later activity points back to an earlier one
      for (let j = 0; j < i; j++) {
        if (sorted[j]!.activity === b.activity) {
          const loopKey = `${b.activity}->${a.activity}`;
          loops.set(loopKey, (loops.get(loopKey) || 0) + 1);
          break;
        }
      }
    }
  }

  return {
    directlyFollows,
    loops,
    starts,
    ends,
    activityFrequency,
    activityCases,
  };
}

function dependency(a: string, b: string, stats: TraceStats): number {
  const forward = stats.directlyFollows.get(`${a}->${b}`) || 0;
  const backward = stats.directlyFollows.get(`${b}->${a}`) || 0;
  if (forward + backward === 0) return 0;
  return (forward - backward) / (forward + backward);
}

function buildDfg(
  stats: TraceStats,
  options: Required<HeuristicsMinerOptions>,
): { nodes: DfgNode[]; edges: DfgEdge[] } {
  const activities = Array.from(stats.activityFrequency.keys()).sort();

  // Build raw edges
  const rawEdges: DfgEdge[] = [];
  for (const [key, frequency] of stats.directlyFollows.entries()) {
    if (frequency < options.frequencyThreshold) continue;
    const [source, target] = key.split("->");
    if (!source || !target) continue;
    const dep = dependency(source, target, stats);
    rawEdges.push({ source, target, frequency, dependency: dep });
  }

  // Add loop edges if they pass the loop threshold
  for (const [key, frequency] of stats.loops.entries()) {
    if (frequency < options.frequencyThreshold) continue;
    const [source, target] = key.split("->");
    if (!source || !target) continue;
    const dep = dependency(source, target, stats);
    if (dep < options.loopThreshold) continue;
    // Avoid duplicate if already present
    if (!rawEdges.some((e) => e.source === source && e.target === target)) {
      rawEdges.push({ source, target, frequency, dependency: dep });
    }
  }

  // Filter by dependency threshold
  const filteredEdges = rawEdges.filter((e) => e.dependency >= options.dependencyThreshold);

  // Build nodes from remaining edges + start/end activities
  const nodeSet = new Set<string>();
  for (const e of filteredEdges) {
    nodeSet.add(e.source);
    nodeSet.add(e.target);
  }
  for (const a of activities) {
    if ((stats.starts.get(a) || 0) > 0 || (stats.ends.get(a) || 0) > 0) {
      nodeSet.add(a);
    }
  }

  const nodes: DfgNode[] = Array.from(nodeSet)
    .sort()
    .map((label) => ({
      id: `act_${label}`,
      label,
      frequency: stats.activityFrequency.get(label) || 0,
      isStart: (stats.starts.get(label) || 0) > 0,
      isEnd: (stats.ends.get(label) || 0) > 0,
    }));

  return { nodes, edges: filteredEdges };
}

function inferGateways(
  edges: DfgEdge[],
  stats: TraceStats,
): {
  xorSplits: Map<string, string[]>;
  andSplits: Map<string, string[]>;
  xorJoins: Map<string, string[]>;
  loops: Map<string, string>;
} {
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();

  for (const e of edges) {
    const out = outgoing.get(e.source) || [];
    out.push(e.target);
    outgoing.set(e.source, out);

    const inc = incoming.get(e.target) || [];
    inc.push(e.source);
    incoming.set(e.target, inc);
  }

  const xorSplits = new Map<string, string[]>();
  const andSplits = new Map<string, string[]>();
  const xorJoins = new Map<string, string[]>();
  const loops = new Map<string, string>();

  // XOR split: multiple outgoing edges with comparable frequency and no strong mutual dependency
  for (const [source, targets] of outgoing.entries()) {
    if (targets.length < 2) continue;

    const targetFreqs = targets.map((t) => ({
      target: t,
      freq: stats.directlyFollows.get(`${source}->${t}`) || 0,
    }));
    const maxFreq = Math.max(...targetFreqs.map((tf) => tf.freq));
    const comparable = targetFreqs.filter((tf) => tf.freq >= maxFreq * 0.2).map((tf) => tf.target);

    if (comparable.length >= 2) {
      xorSplits.set(source, comparable);
    }
  }

  // AND split: activities that co-occur in the same case and have weak dependency in both directions
  for (const [source, targets] of outgoing.entries()) {
    if (targets.length < 2 || xorSplits.has(source)) continue;

    const andCandidates: string[] = [];
    for (const target of targets) {
      const dep = dependency(source, target, stats);
      if (Math.abs(dep) < 0.3) {
        // Weak ordering suggests parallel
        andCandidates.push(target);
      }
    }
    if (andCandidates.length >= 2) {
      andSplits.set(source, andCandidates);
    }
  }

  // XOR join: multiple incoming edges from different branches converging
  for (const [target, sources] of incoming.entries()) {
    if (sources.length < 2) continue;
    const branchSources = sources.filter((s) => {
      const dep = dependency(s, target, stats);
      return dep >= 0.3;
    });
    if (branchSources.length >= 2) {
      xorJoins.set(target, branchSources);
    }
  }

  // Loop: backward edge target -> source where source precedes target frequently
  for (const e of edges) {
    if (e.dependency >= 0 && e.source !== e.target) {
      const forward = stats.directlyFollows.get(`${e.source}->${e.target}`) || 0;
      const reverse = stats.directlyFollows.get(`${e.target}->${e.source}`) || 0;
      if (reverse > 0 && forward > 0) {
        loops.set(e.source, e.target);
      }
    }
  }

  return { xorSplits, andSplits, xorJoins, loops };
}

function buildBlockTree(
  nodes: DfgNode[],
  edges: DfgEdge[],
  stats: TraceStats,
): { blocks: Block[]; tasks: Task[] } {
  if (nodes.length === 0) return { blocks: [], tasks: [] };

  const { xorSplits, andSplits } = inferGateways(edges, stats);
  const tasks: Task[] = nodes.map((n) => ({
    id: `task_${n.label}`,
    name: cleanTaskName(n.label),
    time: 1,
  }));
  const taskMap = new Map(tasks.map((t) => [t.name.toLowerCase(), t]));

  const outgoing = new Map<string, string[]>();
  for (const e of edges) {
    const out = outgoing.get(e.source) || [];
    if (!out.includes(e.target)) out.push(e.target);
    outgoing.set(e.source, out);
  }

  const startNodes = nodes.filter((n) => n.isStart).map((n) => n.label);
  const visited = new Set<string>();

  function activityBlock(label: string): Block {
    const taskId = taskMap.get(cleanTaskName(label).toLowerCase())?.id;
    return {
      id: freshId("blk"),
      type: BlockType.SEQ,
      label: cleanTaskName(label),
      taskId,
      time: 1,
      mode: BlockMode.SIMPLE,
    };
  }

  function traverse(label: string): Block | null {
    if (visited.has(label)) return null;
    visited.add(label);

    const targets = outgoing.get(label) || [];
    const nextTargets = targets.filter((t) => !visited.has(t));

    if (xorSplits.has(label)) {
      const branches = xorSplits
        .get(label)!
        .filter((t) => !visited.has(t))
        .map((targetLabel) => {
          const freq = stats.directlyFollows.get(`${label}->${targetLabel}`) || 1;
          const total = targets.reduce(
            (s, t) => s + (stats.directlyFollows.get(`${label}->${t}`) || 0),
            0,
          );
          const branchBlock = traverse(targetLabel);
          const branch: Branch = {
            id: freshId("br"),
            label: cleanTaskName(targetLabel),
            p: total > 0 ? Math.round((freq / total) * 100) : 50,
            mode: BlockMode.COMPOSITE,
            subBlocks: branchBlock ? [branchBlock] : [],
          };
          return branch;
        });

      return {
        id: freshId("blk"),
        type: BlockType.XOR,
        label: `Decision: ${cleanTaskName(label)}`,
        mode: BlockMode.SIMPLE,
        branches: branches.length > 0 ? branches : undefined,
      };
    }

    if (andSplits.has(label)) {
      const branchLabels = andSplits.get(label)!.filter((t) => !visited.has(t));
      const branchBlocks = branchLabels
        .map((t) => traverse(t))
        .filter((b): b is Block => b !== null);
      return {
        id: freshId("blk"),
        type: BlockType.AND,
        label: `Parallel: ${cleanTaskName(label)}`,
        mode: BlockMode.SIMPLE,
        branches: branchBlocks.map((b) => ({
          id: freshId("br"),
          label: b.label,
          mode: BlockMode.COMPOSITE,
          subBlocks: [b],
        })),
      };
    }

    if (nextTargets.length === 0) {
      return activityBlock(label);
    }

    if (nextTargets.length === 1) {
      const child = traverse(nextTargets[0]!);
      return {
        id: freshId("blk"),
        type: BlockType.SEQ,
        label: cleanTaskName(label),
        taskId: taskMap.get(cleanTaskName(label).toLowerCase())?.id,
        mode: BlockMode.COMPOSITE,
        subBlocks: [activityBlock(label), ...(child ? [child] : [])],
      };
    }

    // Fallback: sequence through all unvisited targets
    const children = nextTargets.map((t) => traverse(t)).filter((b): b is Block => b !== null);
    return {
      id: freshId("blk"),
      type: BlockType.SEQ,
      label: cleanTaskName(label),
      taskId: taskMap.get(cleanTaskName(label).toLowerCase())?.id,
      mode: BlockMode.COMPOSITE,
      subBlocks: [activityBlock(label), ...children],
    };
  }

  const blocks: Block[] = [];
  for (const start of startNodes) {
    if (!visited.has(start)) {
      const block = traverse(start);
      if (block) blocks.push(block);
    }
  }

  // If no start nodes found, pick first unvisited node
  if (blocks.length === 0) {
    const first = nodes.find((n) => !visited.has(n.label));
    if (first) {
      const block = traverse(first.label);
      if (block) blocks.push(block);
    }
  }

  return { blocks, tasks };
}

async function buildBpmnXml(
  nodes: DfgNode[],
  edges: DfgEdge[],
  processName: string,
): Promise<string> {
  const builder = new BpmnBuilder(processName);
  const nodeIds = new Map<string, string>();

  // Start/end events are required for the diagram to be importable ("Apply" walks from the start).
  const startId = builder.addNode("Start", "startEvent", "Start");
  for (const n of nodes) {
    // Prefix must be a valid XML id fragment — never the raw activity label.
    const nodeId = builder.addNode("Task", "task", cleanTaskName(n.label));
    nodeIds.set(n.label, nodeId);
  }
  const endId = builder.addNode("End", "endEvent", "End");

  for (const e of edges) {
    const sourceId = nodeIds.get(e.source);
    const targetId = nodeIds.get(e.target);
    if (sourceId && targetId) {
      builder.addFlow(sourceId, targetId);
    }
  }

  const starts = nodes.filter((n) => n.isStart);
  for (const n of starts.length ? starts : nodes.slice(0, 1)) {
    builder.addFlow(startId, nodeIds.get(n.label)!);
  }
  for (const n of nodes.filter((x) => x.isEnd)) {
    builder.addFlow(nodeIds.get(n.label)!, endId);
  }

  return layoutProcess(builder.toXml());
}

export async function discoverWithHeuristicsMiner(
  events: EventLogItem[],
  processName = "Discovered Heuristics Model",
  options: HeuristicsMinerOptions = {},
): Promise<HeuristicsMinerResult> {
  resetIdCounter();

  if (!events.length) {
    return {
      nodes: [],
      edges: [],
      bpmnXml: "",
      blocks: [],
      tasks: [],
      activitiesCount: 0,
      transitionsCount: 0,
      startActivities: [],
      endActivities: [],
    };
  }

  const opts = { ...DEFAULT_OPTIONS, ...options };
  const stats = buildTraceStats(events);
  const { nodes, edges } = buildDfg(stats, opts);
  const { blocks, tasks } = buildBlockTree(nodes, edges, stats);
  const bpmnXml = await buildBpmnXml(nodes, edges, processName);

  return {
    nodes,
    edges,
    bpmnXml,
    blocks,
    tasks,
    activitiesCount: nodes.length,
    transitionsCount: edges.length,
    startActivities: nodes.filter((n) => n.isStart).map((n) => n.label),
    endActivities: nodes.filter((n) => n.isEnd).map((n) => n.label),
  };
}
