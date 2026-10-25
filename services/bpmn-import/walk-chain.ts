/**
 * Converts an analysed BPMN graph into our Block/Branch tree.
 *
 * Loops are handled up-front by `detectLoops`: when the walk reaches a loop header it opens a
 * loop frame in which back-edges and exits are redirected to a virtual "loop end" node, walks the
 * body as an acyclic region, then continues from the loop's exit. A global step budget, a depth
 * limit and a per-walk visited set guarantee termination (problems become warnings, never throws).
 */
import { BlockType, BlockMode, type Block, type Branch, type Task } from "@/types";
import { cleanTaskName } from "@/utils/formats";
import { t } from "@/utils/i18n";
import { findJoin, type ImportGraph, type ImportEdge, type LoopInfo } from "./graph-analysis";
import { parseProbability } from "./probability";

const MAX_DEPTH = 64;
const MAX_STEPS = 20000;
const LOOP_END_PREFIX = "__loop_end__:";

interface LoopFrame {
  loop: LoopInfo;
  endId: string;
}

interface ResolvedEdge {
  target: string;
  name?: string;
}

export interface WalkContext {
  graph: ImportGraph;
  loops: Map<string, LoopInfo>;
  tasks: Task[];
  warnings: string[];
  frames: LoopFrame[];
  steps: number;
  depth: number;
  freshId: (prefix: string) => string;
}

const isLoopEnd = (id: string): boolean => id.startsWith(LOOP_END_PREFIX);

function warnOnce(ctx: WalkContext, message: string): void {
  if (!ctx.warnings.includes(message)) ctx.warnings.push(message);
}

/** Maps a raw edge target through the active loop frames (innermost first). */
function resolveTarget(edge: ImportEdge, frames: LoopFrame[]): string {
  for (let i = frames.length - 1; i >= 0; i--) {
    const { loop, endId } = frames[i]!;
    if (!loop.body.has(edge.source)) continue;
    if (edge.target === loop.header || !loop.body.has(edge.target)) return endId;
    return edge.target;
  }
  return edge.target;
}

/** Outgoing edges of a node after loop redirection, de-duplicated by target. */
function outgoing(id: string, ctx: WalkContext): ResolvedEdge[] {
  if (isLoopEnd(id)) return [];
  const out: ResolvedEdge[] = [];
  for (const edge of ctx.graph.succ.get(id) ?? []) {
    const target = resolveTarget(edge, ctx.frames);
    if (!out.some((o) => o.target === target)) out.push({ target, name: edge.name });
  }
  return out;
}

function resolveOrCreateTask(rawName: string, ctx: WalkContext): { label: string; task: Task } {
  const taskName = cleanTaskName(rawName || "").trim() || "Step";
  const matched = ctx.tasks.find(
    (task) =>
      task.name.trim().toLowerCase() === taskName.toLowerCase() ||
      task.id.toLowerCase() === taskName.toLowerCase(),
  );
  if (matched) return { label: matched.name, task: matched };
  const newTask: Task = { id: ctx.freshId("task"), name: taskName, time: 1, usedMinutes: 0 };
  ctx.tasks.push(newTask);
  return { label: newTask.name, task: newTask };
}

function toBranch(
  blocks: Block[],
  flowName: string | undefined,
  p: number | undefined,
  ctx: WalkContext,
): Branch {
  const cleanFlow = cleanTaskName(flowName);
  const first = blocks[0];
  if (!first) {
    // Empty branch: pure routing path (split → join). Not an activity, contributes 0.
    return {
      id: ctx.freshId("br"),
      label: cleanFlow || t("common", "blockTypes.branch"),
      p,
      t: 0,
      mode: BlockMode.SIMPLE,
    };
  }
  if (blocks.length === 1 && first.type === BlockType.SEQ && !first.subBlocks?.length) {
    return {
      id: ctx.freshId("br"),
      label: first.label || cleanFlow || t("common", "blockTypes.branch"),
      taskId: first.taskId ?? null,
      p,
      t: first.time ?? 1,
      mode: BlockMode.SIMPLE,
    };
  }
  return {
    id: ctx.freshId("br"),
    label: cleanFlow || first.label || t("common", "blockTypes.branch"),
    p,
    mode: BlockMode.COMPOSITE,
    subBlocks: blocks,
  };
}

/** Builds an XOR / AND block for a split; returns the block and the node to continue from. */
function buildSplit(
  outs: ResolvedEdge[],
  isParallel: boolean,
  label: string,
  ctx: WalkContext,
): { block: Block; next: string | null } {
  const joinId = findJoin(
    (id) => outgoing(id, ctx).map((o) => o.target),
    outs.map((o) => o.target),
  );
  const branches = outs.map((o) => {
    const branchBlocks = o.target === joinId ? [] : walkChain(o.target, joinId, ctx);
    const p = isParallel ? undefined : parseProbability(o.name, Math.round(100 / outs.length));
    return toBranch(branchBlocks, o.name, p, ctx);
  });
  const block: Block = {
    id: ctx.freshId("gw"),
    type: isParallel ? BlockType.AND : BlockType.XOR,
    label: label || t("common", isParallel ? "blockTypes.parallel" : "blockTypes.decision"),
    branches,
  };
  return { block, next: joinId };
}

/** Builds the LOOP block for `loop` and returns the node where the flow continues after it. */
function buildLoop(loop: LoopInfo, ctx: WalkContext): { block: Block; next: string | null } {
  const endId = `${LOOP_END_PREFIX}${loop.header}`;
  ctx.frames.push({ loop, endId });
  const body = walkChain(loop.header, endId, ctx);
  ctx.frames.pop();

  const repeatName = loop.backEdges.map((e) => e.name).find((n) => n?.trim());
  const loopP = parseProbability(repeatName, 20) ?? 20;
  const first = body[0];
  const block: Block =
    body.length === 1 && first?.type === BlockType.SEQ && !first.subBlocks?.length
      ? {
          id: ctx.freshId("loop"),
          type: BlockType.LOOP,
          label: first.label,
          taskId: first.taskId ?? null,
          mode: BlockMode.SIMPLE,
          loopTime: first.time ?? 1,
          loopP,
        }
      : {
          id: ctx.freshId("loop"),
          type: BlockType.LOOP,
          label: t("common", "blockTypes.rework"),
          mode: BlockMode.COMPOSITE,
          subBlocks: body,
          loopP,
        };

  // Exits are resolved against the enclosing frames (an exit may be an outer back-edge).
  const exitTargets = [...new Set(loop.exitEdges.map((e) => resolveTarget(e, ctx.frames)))];
  if (exitTargets.length <= 1) return { block, next: exitTargets[0] ?? null };
  const join = findJoin((id) => outgoing(id, ctx).map((o) => o.target), exitTargets);
  warnOnce(ctx, t("diagram", "bpmnImport.loopMultipleExits"));
  return { block, next: join ?? exitTargets[0]! };
}

/** Walks from `startId` until `stopId` (exclusive), producing a flat block chain. */
export function walkChain(
  startId: string | null,
  stopId: string | null,
  ctx: WalkContext,
): Block[] {
  const out: Block[] = [];
  if (ctx.depth >= MAX_DEPTH) {
    warnOnce(ctx, t("diagram", "bpmnImport.tooDeep"));
    return out;
  }
  ctx.depth++;
  const visited = new Set<string>();
  let currentId = startId;

  while (currentId && currentId !== stopId && !isLoopEnd(currentId)) {
    if (++ctx.steps > MAX_STEPS) {
      warnOnce(ctx, t("diagram", "bpmnImport.tooComplex"));
      break;
    }
    if (visited.has(currentId)) {
      warnOnce(ctx, t("diagram", "bpmnImport.unstructuredCycle"));
      break;
    }
    visited.add(currentId);
    const node = ctx.graph.nodes.get(currentId);
    if (!node) break;

    const loop = ctx.loops.get(currentId);
    if (loop && !ctx.frames.some((f) => f.loop.header === currentId)) {
      const { block, next } = buildLoop(loop, ctx);
      out.push(block);
      currentId = next;
      continue;
    }

    if (node.kind === "activity") {
      const { label, task } = resolveOrCreateTask(node.name || node.id, ctx);
      out.push({
        id: ctx.freshId("blk"),
        type: BlockType.SEQ,
        label,
        taskId: task.id,
        time: task.time ?? 1,
        mode: BlockMode.SIMPLE,
      });
    }

    // Gateways and events (start, end, intermediate) only route; activities may also split.
    const outs = outgoing(currentId, ctx);
    if (outs.length <= 1) {
      currentId = outs[0]?.target ?? null;
      continue;
    }
    const isGateway = node.kind === "gateway";
    const { block, next } = buildSplit(
      outs,
      isGateway && node.isParallel,
      isGateway ? node.name : "",
      ctx,
    );
    out.push(block);
    currentId = next;
  }

  ctx.depth--;
  return out;
}
