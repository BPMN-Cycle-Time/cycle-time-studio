import { BpmnModdle } from "bpmn-moddle";
import { layoutProcess } from "bpmn-auto-layout";
import { BlockType, BlockMode, type Block, type Branch, type Task } from "@/types";
import { cleanTaskName } from "@/utils/formats";
import { t } from "@/utils/i18n";

/**
 * Bidirectional bridge between our Block/Branch tree and BPMN 2.0 XML.
 */

let idCounter = 0;
function freshId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${idCounter}_${Math.random().toString(36).slice(2, 7)}`;
}

import { BpmnBuilder, blocksToSemanticXml } from "./bpmn-builder";
export { BpmnBuilder, blocksToSemanticXml };

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
  const clean = cleanTaskName(rawName || "").trim();
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
                label: t("common", "blockTypes.rework"),
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
        const cleanFlow = cleanTaskName(o.name);
        const firstBranchBlock = branchBlocks[0];
        if (
          branchBlocks.length === 1 &&
          !firstBranchBlock?.branches &&
          firstBranchBlock?.type === BlockType.SEQ
        ) {
          return {
            id: freshId("br"),
            label: firstBranchBlock.label || cleanFlow || t("common", "blockTypes.branch"),
            taskId: firstBranchBlock.taskId ?? null,
            p: parsedP,
            t: firstBranchBlock.time ?? 1,
            mode: BlockMode.SIMPLE,
          };
        }
        // Empty branch (join detection failed or branch has no tasks) — make a safe stub.
        if (branchBlocks.length === 0) {
          return {
            id: freshId("br"),
            label: cleanFlow || t("common", "blockTypes.branch"),
            p: parsedP,
            t: 1,
            mode: BlockMode.SIMPLE,
          };
        }
        return {
          id: freshId("br"),
          label: firstBranchBlock?.label || cleanFlow || "Branch",
          p: parsedP,
          mode: BlockMode.COMPOSITE,
          subBlocks: branchBlocks,
        };
      });

      out.push({
        id: freshId("gw"),
        type: isParallel ? BlockType.AND : BlockType.XOR,
        label:
          el.name ||
          (isParallel ? t("common", "blockTypes.parallel") : t("common", "blockTypes.decision")),
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
    const taskOuts = outgoingOf(el);
    if (taskOuts.length > 1) {
      const joinId = findJoin(
        ctx.elementsById,
        taskOuts.map((o) => o.targetId),
      );
      const branches: Branch[] = taskOuts.map((o) => {
        const branchBlocks = walkChain(o.targetId, joinId, ctx);
        const parsedP = parseProbability(o.name, Math.round(100 / taskOuts.length));
        const cleanFlow = cleanTaskName(o.name);
        const firstBranchBlock = branchBlocks[0];
        if (
          branchBlocks.length === 1 &&
          !firstBranchBlock?.branches &&
          firstBranchBlock?.type === BlockType.SEQ
        ) {
          return {
            id: freshId("br"),
            label: firstBranchBlock.label || cleanFlow || t("common", "blockTypes.branch"),
            taskId: firstBranchBlock.taskId ?? null,
            p: parsedP,
            t: firstBranchBlock.time ?? 1,
            mode: BlockMode.SIMPLE,
          };
        }
        if (branchBlocks.length === 0) {
          return {
            id: freshId("br"),
            label: cleanFlow || t("common", "blockTypes.branch"),
            p: parsedP,
            t: 1,
            mode: BlockMode.SIMPLE,
          };
        }
        return {
          id: freshId("br"),
          label: firstBranchBlock?.label || cleanFlow || "Branch",
          p: parsedP,
          mode: BlockMode.COMPOSITE,
          subBlocks: branchBlocks,
        };
      });

      out.push({
        id: freshId("gw"),
        type: BlockType.XOR,
        label: "Decision",
        branches,
      });

      if (joinId) {
        const joinEl = ctx.elementsById.get(joinId);
        currentId = joinEl ? (outgoingOf(joinEl)[0]?.targetId ?? null) : null;
      } else {
        currentId = null;
      }
      continue;
    }

    currentId = taskOuts[0]?.targetId ?? null;
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
