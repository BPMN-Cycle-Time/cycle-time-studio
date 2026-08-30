import type {
  ProcessGraph,
  ProcessGraphLayout,
  ProcessGraphLayoutNode,
  ProcessGraphRoutedEdge,
} from "@/types";

export const GN_R = 21;
export const GN_COL = 132;
export const GN_ROW = 104;
export const GN_PAD = 46;
export const GN_LABEL = 36;

export function layoutProcessGraph(g: ProcessGraph): ProcessGraphLayout | null {
  if (!g.nodes.length) return null;

  const byId: Record<string, ProcessGraphLayoutNode> = {};
  for (const n of g.nodes) {
    byId[n.id] = { id: n.id };
  }

  const fwd = g.edges.filter((e) => !e.back && byId[e.s] && byId[e.t]);
  const outs: Record<string, string[]> = {};
  const ins: Record<string, string[]> = {};
  const indeg: Record<string, number> = {};

  for (const n of g.nodes) {
    outs[n.id] = [];
    ins[n.id] = [];
    indeg[n.id] = 0;
  }
  for (const e of fwd) {
    outs[e.s]?.push(e.t);
    ins[e.t]?.push(e.s);
    indeg[e.t] = (indeg[e.t] ?? 0) + 1;
  }

  // Longest-path ranking over the forward DAG (Kahn order)
  const rank: Record<string, number> = {};
  const queue: string[] = [];
  for (const n of g.nodes) {
    rank[n.id] = 0;
    if ((indeg[n.id] ?? 0) === 0) queue.push(n.id);
  }

  const deg: Record<string, number> = { ...indeg };
  let guard = 0;
  while (queue.length && guard++ < 10000) {
    const u = queue.shift()!;
    for (const v of outs[u] ?? []) {
      if ((rank[v] ?? 0) < (rank[u] ?? 0) + 1) {
        rank[v] = (rank[u] ?? 0) + 1;
      }
      deg[v] = (deg[v] ?? 0) - 1;
      if (deg[v] === 0) queue.push(v);
    }
  }

  // Long edges spanning multiple columns get dummy waypoints
  const slots: string[][] = [];
  function slotFor(r: number): string[] {
    slots[r] = slots[r] ?? [];
    return slots[r]!;
  }

  const routed: ProcessGraphRoutedEdge[] = [];
  for (const e of fwd) {
    const sRank = rank[e.s] ?? 0;
    const tRank = rank[e.t] ?? 0;
    const span = tRank - sRank;

    if (span <= 1) {
      routed.push({ edge: e, path: [e.s, e.t] });
      continue;
    }

    const chain: string[] = [e.s];
    for (let r = sRank + 1; r < tRank; r++) {
      const dummyId = `d${routed.length}_${r}`;
      const dummyNode: ProcessGraphLayoutNode = { id: dummyId, dummy: true, rank: r };
      byId[dummyId] = dummyNode;
      chain.push(dummyId);
      rank[dummyId] = r;
      outs[dummyId] = [];
      ins[dummyId] = [];
    }
    chain.push(e.t);

    for (let i = 0; i < chain.length - 1; i++) {
      const u = chain[i]!;
      const v = chain[i + 1]!;
      outs[u] = outs[u] ?? [];
      ins[v] = ins[v] ?? [];
      if (byId[u]?.dummy || byId[v]?.dummy) {
        outs[u]!.push(v);
        ins[v]!.push(u);
      }
    }
    routed.push({ edge: e, path: chain });
  }

  for (const id of Object.keys(byId)) {
    slotFor(rank[id] ?? 0).push(id);
  }

  // Barycentre sweeps to untangle columns
  const pos: Record<string, number> = {};
  function reindex() {
    slots.forEach((col) => {
      col?.forEach((id, i) => {
        pos[id] = i;
      });
    });
  }
  reindex();

  function sweep(from: "down" | "up") {
    const order =
      from === "down" ? slots.map((_, i) => i) : slots.map((_, i) => slots.length - 1 - i);

    for (const r of order) {
      const col = slots[r];
      if (!col || col.length < 2) continue;
      const bary: Record<string, number> = {};
      for (const id of col) {
        const nb = (from === "down" ? ins[id] : outs[id]) ?? [];
        const vals = nb
          .map((x) => pos[x])
          .filter((v): v is number => v !== undefined && v !== null);
        bary[id] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : (pos[id] ?? 0);
      }
      col.sort((a, b) => (bary[a] ?? 0) - (bary[b] ?? 0) || (pos[a] ?? 0) - (pos[b] ?? 0));
      reindex();
    }
  }

  for (let pass = 0; pass < 4; pass++) {
    sweep("down");
    sweep("up");
  }

  let maxRows = 1;
  slots.forEach((col) => {
    if (col) maxRows = Math.max(maxRows, col.length);
  });

  const height = GN_PAD + maxRows * GN_ROW + GN_LABEL;
  const midY = GN_PAD + (maxRows * GN_ROW) / 2;
  const xy: Record<string, { x: number; y: number }> = {};

  slots.forEach((col, r) => {
    if (!col) return;
    col.forEach((id, i) => {
      xy[id] = {
        x: GN_PAD + GN_R + r * GN_COL,
        y: midY + (i - (col.length - 1) / 2) * GN_ROW,
      };
    });
  });

  const width = GN_PAD * 2 + GN_R * 2 + Math.max(0, slots.length - 1) * GN_COL;

  return {
    xy,
    byId,
    routed,
    rank,
    width,
    height,
    midY,
    maxRows,
  };
}
