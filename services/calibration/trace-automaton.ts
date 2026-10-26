/**
 * Glushkov-style automaton of a Block tree, used to replay log traces against the model.
 *
 * Activities are nodes; every XOR decision and every LOOP entry / redo is an extra "marker" node.
 * Replaying the step a → b of a trace = shortest path from an `a` node to a `b` node that passes
 * only through markers. The markers on that path tell which XOR branch was taken (tag of the edge
 * leaving the XOR marker) and whether a loop was entered or repeated.
 */
import { BlockMode, BlockType, type Block, type Branch, type Task } from "@/types";
import { isEmptyBranch } from "@/utils/blocks";

export type AutomatonNode =
  | { kind: "activity"; name: string }
  | { kind: "xor"; blockId: string; exitTag: number | null }
  | { kind: "loopEntry"; blockId: string }
  | { kind: "loopRedo"; blockId: string }
  | { kind: "start" }
  | { kind: "end" };

interface Edge {
  to: number;
  /** XOR branch index when leaving an XOR marker. */
  tag: number | null;
}

interface Fragment {
  first: number[];
  last: number[];
  nullable: boolean;
}

/** One marker traversed while replaying a trace step. */
export interface MarkerHit {
  node: number;
  tag: number | null;
}

export const START_NAME = "\u0000start";
export const END_NAME = "\u0000end";

const isMarker = (n: AutomatonNode): boolean =>
  n.kind === "xor" || n.kind === "loopEntry" || n.kind === "loopRedo";

export class TraceAutomaton {
  readonly nodes: AutomatonNode[] = [];
  /** True when the model contains AND blocks (replayed as a sequence — an approximation). */
  hasParallel = false;
  private readonly edges: Edge[][] = [];
  private readonly byName = new Map<string, number[]>();
  private readonly pathCache = new Map<string, MarkerHit[] | null>();
  private readonly taskNames: Map<string, string>;

  constructor(blocks: Block[], tasks: Task[]) {
    this.taskNames = new Map(tasks.map((t) => [t.id, t.name]));
    const start = this.addNode({ kind: "start" });
    const end = this.addNode({ kind: "end" });
    const model = this.buildSeq(blocks);
    this.link([start], model.first);
    this.link(model.last, [end]);
    if (model.nullable) this.link([start], [end]);
  }

  private addNode(node: AutomatonNode): number {
    const idx = this.nodes.push(node) - 1;
    this.edges.push([]);
    const name =
      node.kind === "activity"
        ? node.name
        : node.kind === "start"
          ? START_NAME
          : node.kind === "end"
            ? END_NAME
            : null;
    if (name !== null) this.byName.set(name, [...(this.byName.get(name) ?? []), idx]);
    return idx;
  }

  private addEdge(from: number, to: number, tag: number | null): void {
    const list = this.edges[from]!;
    if (!list.some((e) => e.to === to)) list.push({ to, tag });
  }

  /** follow(last) ∪= first; an XOR marker that may exit directly is tagged with its empty branch. */
  private link(last: number[], first: number[]): void {
    for (const l of last) {
      const node = this.nodes[l]!;
      const tag = node.kind === "xor" ? node.exitTag : null;
      for (const f of first) this.addEdge(l, f, tag);
    }
  }

  private activity(name: string): Fragment {
    const idx = this.addNode({ kind: "activity", name });
    return { first: [idx], last: [idx], nullable: false };
  }

  private nameOf(holder: Block | Branch): string {
    return (holder.taskId && this.taskNames.get(holder.taskId)) || holder.label || holder.id;
  }

  private buildSeq(blocks: Block[]): Fragment {
    const acc: Fragment = { first: [], last: [], nullable: true };
    for (const b of blocks) {
      const f = this.buildBlock(b);
      this.link(acc.last, f.first);
      if (acc.nullable) acc.first.push(...f.first);
      acc.last = f.nullable ? [...acc.last, ...f.last] : f.last;
      acc.nullable = acc.nullable && f.nullable;
    }
    return acc;
  }

  private buildBranch(br: Branch): Fragment {
    if (br.mode === BlockMode.COMPOSITE && br.subBlocks?.length) return this.buildSeq(br.subBlocks);
    if (isEmptyBranch(br)) return { first: [], last: [], nullable: true };
    return this.activity(this.nameOf(br));
  }

  private buildBlock(b: Block): Fragment {
    if (b.type === BlockType.LOOP) return this.buildLoop(b);
    if (b.type === BlockType.XOR && b.branches?.length) return this.buildXor(b, b.branches);
    if (b.type === BlockType.AND && b.branches?.length) {
      this.hasParallel = true;
      const parts: Block[] = b.branches.map((br) => ({
        id: br.id,
        type: BlockType.SEQ,
        label: br.label,
        taskId: br.taskId,
        mode: br.mode,
        subBlocks: br.subBlocks,
        time: br.t,
      }));
      return this.buildSeq(parts);
    }
    if (b.mode === BlockMode.COMPOSITE && b.subBlocks?.length) return this.buildSeq(b.subBlocks);
    if (b.mode === BlockMode.COMPOSITE) return { first: [], last: [], nullable: true };
    return this.activity(this.nameOf(b));
  }

  private buildXor(b: Block, branches: Branch[]): Fragment {
    const parts = branches.map((br) => this.buildBranch(br));
    const exitIdx = parts.findIndex((p) => p.nullable);
    const marker = this.addNode({
      kind: "xor",
      blockId: b.id,
      exitTag: exitIdx === -1 ? null : exitIdx,
    });
    parts.forEach((p, k) => p.first.forEach((f) => this.addEdge(marker, f, k)));
    const last = parts.flatMap((p) => p.last);
    return { first: [marker], last: exitIdx === -1 ? last : [marker, ...last], nullable: false };
  }

  private buildLoop(b: Block): Fragment {
    const entry = this.addNode({ kind: "loopEntry", blockId: b.id });
    const redo = this.addNode({ kind: "loopRedo", blockId: b.id });
    const body =
      b.mode === BlockMode.COMPOSITE && b.subBlocks?.length
        ? this.buildSeq(b.subBlocks)
        : this.activity(this.nameOf(b));
    this.link([entry], body.first);
    this.link(body.last, [redo]);
    this.link([redo], body.first);
    const last = body.nullable ? [...body.last, entry, redo] : body.last;
    return { first: [entry], last, nullable: false };
  }

  /**
   * Markers traversed between consecutive trace activities `from` → `to` (use START_NAME /
   * END_NAME for the trace boundaries), or null when the model cannot replay this step.
   */
  replayStep(from: string, to: string): MarkerHit[] | null {
    const key = `${from}\u0001${to}`;
    if (this.pathCache.has(key)) return this.pathCache.get(key)!;
    const result = this.shortestMarkerPath(from, to);
    this.pathCache.set(key, result);
    return result;
  }

  private shortestMarkerPath(from: string, to: string): MarkerHit[] | null {
    const sources = this.byName.get(from) ?? [];
    const targets = new Set(this.byName.get(to) ?? []);
    if (!sources.length || !targets.size) return null;

    // BFS state = node; parent pointers store the edge (from, tag) used to reach it.
    const parent = new Map<number, { prev: number; tag: number | null } | null>();
    const queue: number[] = [];
    for (const s of sources) {
      parent.set(s, null);
      queue.push(s);
    }
    for (let head = 0; head < queue.length; head++) {
      const current = queue[head]!;
      for (const edge of this.edges[current]!) {
        // Targets are never expanded, so a target that is also a source (a → … → a) still matches.
        if (targets.has(edge.to)) return this.collectHits({ prev: current, tag: edge.tag }, parent);
        if (parent.has(edge.to) || !isMarker(this.nodes[edge.to]!)) continue;
        parent.set(edge.to, { prev: current, tag: edge.tag });
        queue.push(edge.to);
      }
    }
    return null;
  }

  private collectHits(
    lastStep: { prev: number; tag: number | null },
    parent: Map<number, { prev: number; tag: number | null } | null>,
  ): MarkerHit[] {
    const hits: MarkerHit[] = [];
    let step: { prev: number; tag: number | null } | null | undefined = lastStep;
    while (step) {
      if (isMarker(this.nodes[step.prev]!)) hits.unshift({ node: step.prev, tag: step.tag });
      step = parent.get(step.prev);
    }
    return hits;
  }
}
