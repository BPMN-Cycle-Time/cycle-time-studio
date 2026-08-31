import { BpmnModdle } from "bpmn-moddle";
import { layoutProcess } from "bpmn-auto-layout";
import { BlockType, BlockMode, type Block, type Branch, type Task } from "@/types";

/**
 * Bidirectional bridge between our Block/Branch tree and BPMN 2.0 XML.
 */

let idCounter = 0;
function freshId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${idCounter}_${Math.random().toString(36).slice(2, 7)}`;
}

// ---------------------------------------------------------------------------
// Blocks -> BPMN XML
// ---------------------------------------------------------------------------

interface BpmnNodeDef {
  id: string;
  tag: "task" | "startEvent" | "endEvent" | "exclusiveGateway" | "parallelGateway";
  name: string;
  incoming: string[];
  outgoing: string[];
}

interface BpmnFlowDef {
  id: string;
  sourceId: string;
  targetId: string;
  name?: string;
}

class BpmnBuilder {
  processName: string;
  nodes: Map<string, BpmnNodeDef>;
  flows: BpmnFlowDef[];
  private counter: number;

  constructor(processName = "Process") {
    this.processName = processName;
    this.nodes = new Map();
    this.flows = [];
    this.counter = 0;
  }

  freshId(prefix: string): string {
    this.counter += 1;
    return `${prefix}_${this.counter}_${Math.random().toString(36).slice(2, 7)}`;
  }

  addNode(
    prefix: string,
    tag: "task" | "startEvent" | "endEvent" | "exclusiveGateway" | "parallelGateway",
    name = "",
  ): string {
    const id = this.freshId(prefix);
    this.nodes.set(id, { id, tag, name, incoming: [], outgoing: [] });
    return id;
  }

  addFlow(sourceId: string, targetId: string, name = ""): string {
    const id = this.freshId("Flow");
    const flow: BpmnFlowDef = { id, sourceId, targetId, name };
    this.flows.push(flow);

    const sNode = this.nodes.get(sourceId);
    if (sNode) sNode.outgoing.push(id);

    const tNode = this.nodes.get(targetId);
    if (tNode) tNode.incoming.push(id);

    return id;
  }

  escapeXml(s: string): string {
    return (s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  toXml(): string {
    const nodesXml = Array.from(this.nodes.values()).map((n) => {
      const nameAttr = n.name ? ` name="${this.escapeXml(n.name)}"` : "";
      const inXml = n.incoming.map((f) => `<bpmn:incoming>${f}</bpmn:incoming>`);
      const outXml = n.outgoing.map((f) => `<bpmn:outgoing>${f}</bpmn:outgoing>`);
      const children = [...inXml, ...outXml].join("\n      ");
      if (children) {
        return `<bpmn:${n.tag} id="${n.id}"${nameAttr}>\n      ${children}\n    </bpmn:${n.tag}>`;
      }
      return `<bpmn:${n.tag} id="${n.id}"${nameAttr} />`;
    });

    const flowsXml = this.flows.map((f) => {
      const nameAttr = f.name ? ` name="${this.escapeXml(f.name)}"` : "";
      return `<bpmn:sequenceFlow id="${f.id}"${nameAttr} sourceRef="${f.sourceId}" targetRef="${f.targetId}" />`;
    });

    return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  id="Definitions_1" targetNamespace="http://cycletime.studio/bpmn">
  <bpmn:process id="Process_1" name="${this.escapeXml(this.processName)}" isExecutable="false">
    ${nodesXml.join("\n    ")}
    ${flowsXml.join("\n    ")}
  </bpmn:process>
</bpmn:definitions>`;
  }
}

/** Renders a flat array of blocks as a connected chain, returning its start/tail ids. */
function renderChain(
  blocks: Block[],
  builder: BpmnBuilder,
  afterId: string | null,
  tasks?: Task[],
): { startId: string | null; tailId: string | null } {
  let prevId = afterId;
  let startId: string | null = null;

  for (const b of blocks) {
    const res = renderBlock(b, builder, prevId, tasks);
    if (!startId) startId = res.startId;
    prevId = res.tailId;
  }

  return { startId: startId ?? prevId, tailId: prevId };
}

/** Renders a single block, wires it after `afterId` (if any), returns startId and tailId. */
function renderBlock(
  b: Block,
  builder: BpmnBuilder,
  afterId: string | null,
  tasks?: Task[],
): { startId: string | null; tailId: string | null } {
  if (b.type === BlockType.SEQ) {
    if (b.mode === BlockMode.COMPOSITE && b.subBlocks?.length) {
      const { startId, tailId } = renderChain(b.subBlocks, builder, null, tasks);
      if (afterId && startId) builder.addFlow(afterId, startId);
      return { startId: startId ?? afterId, tailId: tailId ?? startId ?? afterId };
    }
    const taskName = (b.taskId ? tasks?.find((t) => t.id === b.taskId)?.name : null) || b.label;
    const taskId = builder.addNode("Task", "task", taskName);
    if (afterId) builder.addFlow(afterId, taskId);
    return { startId: taskId, tailId: taskId };
  }

  if (b.type === BlockType.XOR || b.type === BlockType.AND) {
    const isXor = b.type === BlockType.XOR;
    const splitId = builder.addNode(
      isXor ? "GwSplit" : "PwSplit",
      isXor ? "exclusiveGateway" : "parallelGateway",
      b.label,
    );
    if (afterId) builder.addFlow(afterId, splitId);

    const branchTails: string[] = [];
    for (const br of b.branches ?? []) {
      const brTaskName = br.taskId ? tasks?.find((t) => t.id === br.taskId)?.name : null;
      const isTaskName =
        brTaskName && br.label?.trim().toLowerCase() === brTaskName.trim().toLowerCase();
      let flowName = "";
      if (isXor) {
        if (br.label && !isTaskName && br.label !== "Branch") {
          flowName = br.label;
        } else if (br.p != null) {
          flowName = `${br.p / 100}`;
        }
      } else {
        flowName = !isTaskName && br.label !== "Branch" ? br.label || "" : "";
      }

      const branchBlocks: Block[] =
        br.mode === BlockMode.COMPOSITE && br.subBlocks?.length
          ? br.subBlocks
          : [
              {
                id: br.id,
                type: BlockType.SEQ,
                label: brTaskName || br.label,
                taskId: br.taskId,
                time: br.t,
                mode: BlockMode.SIMPLE,
              } as Block,
            ];
      const { startId, tailId } = renderChain(branchBlocks, builder, null, tasks);
      if (startId) builder.addFlow(splitId, startId, flowName);
      branchTails.push(tailId ?? splitId);
    }

    const joinId = builder.addNode(
      isXor ? "GwJoin" : "PwJoin",
      isXor ? "exclusiveGateway" : "parallelGateway",
    );
    for (const t of branchTails) {
      builder.addFlow(t, joinId);
    }
    return { startId: splitId, tailId: joinId };
  }

  if (b.type === BlockType.LOOP) {
    const isSingleTask =
      b.mode !== BlockMode.COMPOSITE || !b.subBlocks?.length || b.subBlocks.length === 1;

    if (isSingleTask) {
      // Compact Single-Task Loop (matches original BPMN standard):
      // afterId -> Task -> Decision Gateway -> (Repeat flow back directly to Task)
      const loopTaskName = b.taskId ? tasks?.find((t) => t.id === b.taskId)?.name : null;
      const taskName = loopTaskName || b.label;
      const taskId = builder.addNode("Task", "task", taskName);
      if (afterId) builder.addFlow(afterId, taskId);

      const decisionGwId = builder.addNode("LoopDecision", "exclusiveGateway");
      builder.addFlow(taskId, decisionGwId);

      const loopLabel =
        b.label && b.label !== "Rework loop" && b.label !== "Loop"
          ? b.label
          : `Repeat (${b.loopP ?? 0}%)`;
      builder.addFlow(decisionGwId, taskId, loopLabel);

      return { startId: taskId, tailId: decisionGwId };
    }

    // Composite multi-block loop:
    // afterId -> Merge Gateway -> Body Chain -> Decision Gateway -> (Repeat flow to Merge)
    const mergeGwId = builder.addNode("LoopMerge", "exclusiveGateway");
    if (afterId) builder.addFlow(afterId, mergeGwId);

    const { tailId } = renderChain(b.subBlocks!, builder, mergeGwId, tasks);

    const decisionGwId = builder.addNode("LoopDecision", "exclusiveGateway");
    builder.addFlow(tailId ?? mergeGwId, decisionGwId);

    const loopLabel =
      b.label && b.label !== "Rework loop" && b.label !== "Loop"
        ? b.label
        : `Repeat (${b.loopP ?? 0}%)`;
    builder.addFlow(decisionGwId, mergeGwId, loopLabel);

    return { startId: mergeGwId, tailId: decisionGwId };
  }

  return { startId: afterId, tailId: afterId };
}

export function blocksToSemanticXml(blocks: Block[], processName: string, tasks?: Task[]): string {
  const builder = new BpmnBuilder(processName);
  const startId = builder.addNode("Start", "startEvent", "Start");
  const { tailId } = renderChain(blocks, builder, startId, tasks);
  const endId = builder.addNode("End", "endEvent", "End");
  if (tailId) builder.addFlow(tailId, endId);

  return builder.toXml();
}

/** Full pipeline: blocks -> semantic XML -> auto-laid-out XML ready to load into bpmn-js. */
export async function blocksToBpmnXml(
  blocks: Block[],
  processName = "Process",
  tasks?: Task[],
): Promise<string> {
  const semantic = blocksToSemanticXml(blocks, processName, tasks);
  return layoutProcess(semantic);
}

// ---------------------------------------------------------------------------
// BPMN XML -> Blocks
// ---------------------------------------------------------------------------

interface MoBpmnElement {
  id: string;
  $type: string;
  name?: string;
  outgoing?: { id: string; targetRef: MoBpmnElement; name?: string }[];
  incoming?: unknown[];
}

function outgoingOf(el: MoBpmnElement): { targetId: string; name?: string }[] {
  return (el.outgoing ?? [])
    .map((f) => ({ targetId: f.targetRef?.id, name: f.name }))
    .filter((f) => f.targetId);
}

/**
 * Finds where parallel branches out of a split gateway converge again, by BFS from every
 * branch start and intersecting the reachable sets. Falls back to `null` (no convergence
 * found within the search — e.g. branches that each run to their own end event).
 */
function findJoin(
  elementsById: Map<string, MoBpmnElement>,
  branchStartIds: string[],
): string | null {
  const reach: Map<string, number>[] = branchStartIds.map((start) => {
    const dist = new Map<string, number>();
    const queue: [string, number][] = [[start, 0]];
    let steps = 0;
    while (queue.length && steps < 200) {
      const [id, d] = queue.shift()!;
      if (dist.has(id)) continue;
      dist.set(id, d);
      const el = elementsById.get(id);
      if (!el) continue;
      for (const { targetId } of outgoingOf(el)) queue.push([targetId, d + 1]);
      steps++;
    }
    return dist;
  });

  let best: string | null = null;
  let bestScore = Infinity;
  for (const [id, d0] of reach[0]) {
    if (branchStartIds.includes(id)) continue; // don't count the split's own outgoing targets trivially
    let total = d0;
    let inAll = true;
    for (let i = 1; i < reach.length; i++) {
      const d = reach[i].get(id);
      if (d === undefined) {
        inAll = false;
        break;
      }
      total += d;
    }
    if (inAll && total < bestScore) {
      bestScore = total;
      best = id;
    }
  }
  return best;
}

interface WalkContext {
  elementsById: Map<string, MoBpmnElement>;
  /** node id -> index in `out` at which it was first pushed; used to detect back-edges (loops). */
  pathIndex: Map<string, number>;
  tasks: Task[];
}

function resolveOrCreateTask(
  rawName: string,
  tasks: Task[],
): { label: string; taskId: string; time: number } {
  const clean = (rawName || "").trim();
  const taskName = clean || "Step";
  const matched = tasks.find(
    (t) =>
      t.name.trim().toLowerCase() === taskName.toLowerCase() ||
      t.id.toLowerCase() === taskName.toLowerCase(),
  );
  if (matched) {
    return { label: matched.name, taskId: matched.id, time: matched.time ?? 1 };
  }
  const newTask: Task = {
    id: freshId("task"),
    name: taskName,
    time: 1,
    usedMinutes: 0,
  };
  tasks.push(newTask);
  return { label: newTask.name, taskId: newTask.id, time: newTask.time ?? 1 };
}

/**
 * Intelligently extracts a probability / repeat percentage (0..100) from a label string.
 * Handles formats:
 * - "Yes - 0.7" -> 70
 * - "No - 0.3" -> 30
 * - "r1 - 0.5" -> 50
 * - "r2 - 0.4" -> 40
 * - "70%" or "Repeat (50%)" -> 70 / 50
 * - "p = 0.65" -> 65
 * - "Branch 1 - 25%" -> 25
 * - "0.8" -> 80
 */
export function parseProbability(rawLabel?: string, defaultVal?: number): number | undefined {
  if (!rawLabel || !rawLabel.trim()) return defaultVal;
  const label = rawLabel.trim();

  // 1. Explicit percentage: e.g. "70%", "50.5%", "Repeat (20%)", "r1 - 50%"
  const percentMatch = label.match(/(\d+(?:\.\d+)?)\s*%/);
  if (percentMatch && percentMatch[1]) {
    const val = parseFloat(percentMatch[1]);
    if (!isNaN(val)) return Math.min(100, Math.max(0, val));
  }

  // 2. Explicit decimal ratio in (0, 1] e.g. "0.7", "0.5", "r1 - 0.5", "Yes - 0.7", "p=0.4"
  const decimalMatch = label.match(/(?:^|[-:=~,\s(])\s*(0(?:\.\d+)?|1(?:\.0+)?)(?:$|[-:=~,\s)%])/);
  if (decimalMatch && decimalMatch[1]) {
    const val = parseFloat(decimalMatch[1]);
    if (!isNaN(val)) {
      return Math.min(100, Math.max(0, Math.round(val * 100 * 100) / 100));
    }
  }

  // 3. Number after delimiter: e.g. "Yes - 70", "r1: 50", "p = 40", "r1 - 50"
  const delimMatch = label.match(/(?:[-:=~]|p(?:rob)?|repeat|rate)\s*[:=]?\s*(\d+(?:\.\d+)?)/i);
  if (delimMatch && delimMatch[1]) {
    const val = parseFloat(delimMatch[1]);
    if (!isNaN(val)) {
      return val <= 1 && val > 0
        ? Math.round(val * 100 * 100) / 100
        : Math.min(100, Math.max(0, val));
    }
  }

  // 4. Fallback: take the last number in the string (ignores prefix IDs like 'r1' or 'flow2' if followed by actual number)
  const allNumbers = Array.from(label.matchAll(/(\d+(?:\.\d+)?)/g));
  if (allNumbers.length > 0) {
    const lastNumStr = allNumbers[allNumbers.length - 1]![1]!;
    const val = parseFloat(lastNumStr);
    if (!isNaN(val)) {
      return val <= 1 && val > 0
        ? Math.round(val * 100 * 100) / 100
        : Math.min(100, Math.max(0, val));
    }
  }

  return defaultVal;
}

function walkChain(startId: string | null, stopId: string | null, ctx: WalkContext): Block[] {
  const out: Block[] = [];
  let currentId = startId;
  const localPath = new Map<string, number>();
  let guard = 0;

  while (currentId && currentId !== stopId && guard < 500) {
    guard++;
    const el = ctx.elementsById.get(currentId);
    if (!el) break;

    if (el.$type === "bpmn:EndEvent" || el.$type === "bpmn:StartEvent") {
      currentId = outgoingOf(el)[0]?.targetId ?? null;
      continue;
    }

    if (el.$type.endsWith("Gateway")) {
      const outs = outgoingOf(el);
      if (outs.length <= 1) {
        currentId = outs[0]?.targetId ?? null;
        continue;
      }

      // Back-edge check: one of the outgoing targets already appears earlier in this chain -> loop.
      const backEdge = outs.find((o) => localPath.has(o.targetId));
      if (backEdge) {
        const bodyStart = localPath.get(backEdge.targetId)!;
        const bodyBlocks = out.splice(bodyStart);
        const parsedP = parseProbability(backEdge.name, 20) ?? 20;
        const forward = outs.find((o) => o !== backEdge);
        const firstBody = bodyBlocks[0];
        const loopBlock: Block =
          bodyBlocks.length === 1 && !firstBody.branches && firstBody.type === BlockType.SEQ
            ? {
                id: freshId("loop"),
                type: BlockType.LOOP,
                label: firstBody.label,
                taskId: firstBody.taskId ?? null,
                mode: BlockMode.SIMPLE,
                loopTime: firstBody.time ?? 1,
                loopP: parsedP,
              }
            : {
                id: freshId("loop"),
                type: BlockType.LOOP,
                label: "Rework loop",
                mode: BlockMode.COMPOSITE,
                subBlocks: bodyBlocks,
                loopP: parsedP,
              };
        out.push(loopBlock);
        currentId = forward?.targetId ?? null;
        continue;
      }

      const isParallel = el.$type === "bpmn:ParallelGateway";
      const joinId = findJoin(
        ctx.elementsById,
        outs.map((o) => o.targetId),
      );
      const branches: Branch[] = outs.map((o) => {
        const branchBlocks = walkChain(o.targetId, joinId, ctx);
        const parsedP = isParallel
          ? undefined
          : parseProbability(o.name, Math.round(100 / outs.length));
        const firstBranchBlock = branchBlocks[0];
        if (
          branchBlocks.length === 1 &&
          !firstBranchBlock?.branches &&
          firstBranchBlock?.type === BlockType.SEQ
        ) {
          return {
            id: freshId("br"),
            label: o.name || firstBranchBlock.label,
            taskId: firstBranchBlock.taskId ?? null,
            p: parsedP,
            t: firstBranchBlock.time ?? 1,
            mode: BlockMode.SIMPLE,
          };
        }
        return {
          id: freshId("br"),
          label: o.name || firstBranchBlock?.label || "Branch",
          p: parsedP,
          mode: BlockMode.COMPOSITE,
          subBlocks: branchBlocks,
        };
      });

      out.push({
        id: freshId("gw"),
        type: isParallel ? BlockType.AND : BlockType.XOR,
        label: el.name || (isParallel ? "Parallel work" : "Decision"),
        branches,
      });

      if (joinId) {
        const joinEl = ctx.elementsById.get(joinId);
        currentId = joinEl ? (outgoingOf(joinEl)[0]?.targetId ?? null) : null;
      } else {
        currentId = null; // branches never reconverge (e.g. each ends independently)
      }
      continue;
    }

    // Task-like element (Task, UserTask, ServiceTask, ManualTask, ...).
    localPath.set(currentId, out.length);
    const resolved = resolveOrCreateTask(el.name || el.id, ctx.tasks);
    out.push({
      id: freshId("blk"),
      type: BlockType.SEQ,
      label: resolved.label,
      taskId: resolved.taskId,
      time: resolved.time,
      mode: BlockMode.SIMPLE,
    });
    currentId = outgoingOf(el)[0]?.targetId ?? null;
  }

  return out;
}

export interface BpmnImportResult {
  blocks: Block[];
  tasks: Task[];
  warnings: string[];
}

export async function bpmnXmlToBlocks(
  xml: string,
  existingTasks?: Task[],
): Promise<BpmnImportResult> {
  const moddle = new BpmnModdle();
  const { rootElement, references } = await moddle.fromXML(xml);
  void references;

  const warnings: string[] = [];
  const process = rootElement.rootElements?.find((r: MoBpmnElement) => r.$type === "bpmn:Process");
  if (!process)
    return {
      blocks: [],
      tasks: existingTasks || [],
      warnings: ["No <bpmn:process> found in this file."],
    };

  const flowElements: MoBpmnElement[] = process.flowElements ?? [];
  const elementsById = new Map<string, MoBpmnElement>(flowElements.map((el) => [el.id, el]));

  const start = flowElements.find((el) => el.$type === "bpmn:StartEvent");
  if (!start) {
    warnings.push("No start event found — cannot determine where the flow begins.");
    return { blocks: [], tasks: existingTasks || [], warnings };
  }
  const starts = flowElements.filter((el) => el.$type === "bpmn:StartEvent");
  if (starts.length > 1)
    warnings.push(`This diagram has ${starts.length} start events — only the first was used.`);

  const pools = rootElement.rootElements?.filter(
    (r: MoBpmnElement) => r.$type === "bpmn:Collaboration",
  );
  if (pools?.length)
    warnings.push("This file has multiple pools/lanes — only the first process was converted.");

  const tasks: Task[] = existingTasks ? [...existingTasks] : [];
  const blocks = walkChain(start.id, null, { elementsById, pathIndex: new Map(), tasks });
  return { blocks, tasks, warnings };
}
