/**
 * Graph pre-processing for BPMN import: classifies flow nodes, detects loops (DFS back-edges +
 * natural loop bodies) and finds where split branches re-converge.
 */

export type ImportNodeKind = "activity" | "gateway" | "event";

export interface ImportNode {
  id: string;
  kind: ImportNodeKind;
  name: string;
  isParallel: boolean;
  /** Name of the (innermost) lane containing this node, if any. */
  lane?: string;
}

export interface ImportEdge {
  source: string;
  target: string;
  name?: string;
}

export interface ImportGraph {
  nodes: Map<string, ImportNode>;
  succ: Map<string, ImportEdge[]>;
  pred: Map<string, ImportEdge[]>;
}

export interface LoopInfo {
  header: string;
  /** Nodes of the natural loop (header included). */
  body: Set<string>;
  /** Edges from inside the body back to the header (the "redo" paths). */
  backEdges: ImportEdge[];
  /** Edges leaving the body. */
  exitEdges: ImportEdge[];
}

/** Minimal structural view of a bpmn-moddle flow element. */
export interface MoFlowElement {
  id: string;
  $type: string;
  name?: string;
  outgoing?: { targetRef?: { id: string }; name?: string }[];
}

/** Minimal structural view of a bpmn-moddle lane (lanes may nest via `childLaneSet`). */
export interface MoLane {
  name?: string;
  flowNodeRef?: { id: string }[];
  childLaneSet?: { lanes?: MoLane[] };
}

/** Maps flow node id → name of the innermost lane that references it. */
export function collectLaneNames(lanes: MoLane[] | undefined): Map<string, string> {
  const laneOf = new Map<string, string>();
  const visit = (list: MoLane[] | undefined): void => {
    for (const lane of list ?? []) {
      const name = lane.name?.trim();
      if (name) for (const ref of lane.flowNodeRef ?? []) if (ref?.id) laneOf.set(ref.id, name);
      visit(lane.childLaneSet?.lanes); // nested lanes override their parent
    }
  };
  visit(lanes);
  return laneOf;
}

const ACTIVITY_TYPES = new Set(["bpmn:SubProcess", "bpmn:CallActivity", "bpmn:Transaction"]);

function classify(type: string): ImportNodeKind | null {
  if (type.endsWith("Gateway")) return "gateway";
  if (type.endsWith("Event")) return "event";
  if (type.endsWith("Task") || ACTIVITY_TYPES.has(type)) return "activity";
  return null; // sequence flows, data objects, annotations, ...
}

export function buildImportGraph(
  flowElements: MoFlowElement[],
  laneOf: Map<string, string> = new Map(),
): ImportGraph {
  const nodes = new Map<string, ImportNode>();
  for (const el of flowElements) {
    const kind = classify(el.$type);
    if (!kind) continue;
    nodes.set(el.id, {
      id: el.id,
      kind,
      name: el.name ?? "",
      isParallel: el.$type === "bpmn:ParallelGateway",
      lane: laneOf.get(el.id),
    });
  }

  const succ = new Map<string, ImportEdge[]>();
  const pred = new Map<string, ImportEdge[]>();
  for (const id of nodes.keys()) {
    succ.set(id, []);
    pred.set(id, []);
  }
  for (const el of flowElements) {
    if (!nodes.has(el.id)) continue;
    for (const flow of el.outgoing ?? []) {
      const target = flow.targetRef?.id;
      if (!target || !nodes.has(target)) continue;
      const edge: ImportEdge = { source: el.id, target, name: flow.name };
      succ.get(el.id)!.push(edge);
      pred.get(target)!.push(edge);
    }
  }
  return { nodes, succ, pred };
}

/** Iterative DFS from `startId`; an edge to a node still on the DFS stack is a back-edge. */
function findBackEdges(graph: ImportGraph, startId: string): ImportEdge[] {
  const backEdges: ImportEdge[] = [];
  const state = new Map<string, "active" | "done">();
  const stack: { id: string; next: number }[] = [{ id: startId, next: 0 }];
  state.set(startId, "active");

  while (stack.length) {
    const frame = stack[stack.length - 1]!;
    const edges = graph.succ.get(frame.id) ?? [];
    if (frame.next >= edges.length) {
      state.set(frame.id, "done");
      stack.pop();
      continue;
    }
    const edge = edges[frame.next++]!;
    const targetState = state.get(edge.target);
    if (targetState === "active") backEdges.push(edge);
    else if (!targetState) {
      state.set(edge.target, "active");
      stack.push({ id: edge.target, next: 0 });
    }
  }
  return backEdges;
}

/**
 * Detects every loop reachable from `startId`, keyed by loop header (back-edge target).
 * The body is the natural loop: header + all nodes that reach a back-edge source without
 * passing through the header.
 */
export function detectLoops(graph: ImportGraph, startId: string): Map<string, LoopInfo> {
  const byHeader = new Map<string, ImportEdge[]>();
  for (const edge of findBackEdges(graph, startId)) {
    byHeader.set(edge.target, [...(byHeader.get(edge.target) ?? []), edge]);
  }

  const loops = new Map<string, LoopInfo>();
  for (const [header, backEdges] of byHeader) {
    const body = new Set<string>([header]);
    const queue = backEdges.map((e) => e.source);
    while (queue.length) {
      const id = queue.pop()!;
      if (body.has(id)) continue;
      body.add(id);
      for (const e of graph.pred.get(id) ?? []) queue.push(e.source);
    }
    const exitEdges: ImportEdge[] = [];
    for (const id of body) {
      for (const e of graph.succ.get(id) ?? []) if (!body.has(e.target)) exitEdges.push(e);
    }
    loops.set(header, { header, body, backEdges, exitEdges });
  }
  return loops;
}

/**
 * Finds where split branches converge again: the node reachable from every branch start with
 * the smallest total distance. A branch start may itself be the join (an empty branch that goes
 * straight to the merge gateway). Returns `null` when the branches never re-converge.
 */
export function findJoin(
  successors: (id: string) => string[],
  branchStartIds: string[],
  maxSteps = 2000,
): string | null {
  const reach = branchStartIds.map((start) => {
    const dist = new Map<string, number>([[start, 0]]);
    const queue = [start];
    for (let head = 0; head < queue.length && head < maxSteps; head++) {
      const id = queue[head]!;
      for (const next of successors(id)) {
        if (dist.has(next)) continue;
        dist.set(next, dist.get(id)! + 1);
        queue.push(next);
      }
    }
    return dist;
  });

  let best: string | null = null;
  let bestScore = Infinity;
  for (const [id, d0] of reach[0] ?? []) {
    let total = d0;
    let inAll = true;
    for (let i = 1; i < reach.length; i++) {
      const d = reach[i]!.get(id);
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
