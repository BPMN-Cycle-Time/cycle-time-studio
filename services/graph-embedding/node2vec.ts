/**
 * Node2Vec (Grover & Leskovec 2016): biased 2nd-order random walks on the undirected version of
 * the graph + skip-gram negative sampling. Deterministic for a given seed.
 */
import type { LabeledGraph, Node2VecOptions } from "@/types";
import { SeededRandom, WeightedSampler } from "./random";
import { trainSgns } from "./sgns";

export const NODE2VEC_DEFAULTS: Required<Node2VecOptions> = {
  dimensions: 16,
  walkLength: 10,
  numWalks: 100,
  p: 1,
  q: 1,
  window: 5,
  negative: 5,
  epochs: 1,
  learningRate: 0.025,
  minLearningRate: 0.0001,
  seed: 42,
};

/** Undirected weighted adjacency (weights of both directions summed, self-loops dropped). */
type Adjacency = Map<string, Map<string, number>>;

function undirectedAdjacency(graph: LabeledGraph): Adjacency {
  const adj: Adjacency = new Map(graph.nodes.map((n) => [n.id, new Map<string, number>()]));
  for (const e of graph.edges) {
    if (e.source === e.target || !adj.has(e.source) || !adj.has(e.target)) continue;
    const w = e.weight ?? 1;
    const a = adj.get(e.source)!;
    const b = adj.get(e.target)!;
    a.set(e.target, (a.get(e.target) ?? 0) + w);
    b.set(e.source, (b.get(e.source) ?? 0) + w);
  }
  return adj;
}

/** Unnormalised weights of the next step from `current`, arriving from `previous`. */
function stepWeights(
  adj: Adjacency,
  previous: string | null,
  current: string,
  p: number,
  q: number,
): [string, number][] {
  const neighbours = adj.get(current) ?? new Map<string, number>();
  const prevNeighbours = previous === null ? null : adj.get(previous);
  return [...neighbours].map(([x, w]) => {
    if (previous === null) return [x, w];
    const alpha = x === previous ? 1 / p : prevNeighbours?.has(x) ? 1 : 1 / q;
    return [x, w * alpha];
  });
}

/** Normalised transition probabilities of the 2nd-order walk (first step: proportional to weight). */
export function node2vecTransitionProbabilities(
  graph: LabeledGraph,
  previous: string | null,
  current: string,
  p: number,
  q: number,
): Record<string, number> {
  const weights = stepWeights(undirectedAdjacency(graph), previous, current, p, q);
  const total = weights.reduce((s, [, w]) => s + w, 0);
  return Object.fromEntries(weights.map(([x, w]) => [x, total > 0 ? w / total : 0]));
}

function generateWalks(
  graph: LabeledGraph,
  opts: Required<Node2VecOptions>,
  rng: SeededRandom,
): string[][] {
  const adj = undirectedAdjacency(graph);
  const ids = graph.nodes.map((n) => n.id);
  const walks: string[][] = [];
  for (let round = 0; round < opts.numWalks; round++) {
    for (const start of rng.shuffle([...ids])) {
      const walk = [start];
      while (walk.length < opts.walkLength) {
        const current = walk[walk.length - 1]!;
        const previous = walk.length > 1 ? walk[walk.length - 2]! : null;
        const options = stepWeights(adj, previous, current, opts.p, opts.q);
        if (!options.length) break;
        const pick = new WeightedSampler(options.map(([, w]) => w)).sample(rng);
        walk.push(options[pick]![0]);
      }
      walks.push(walk);
    }
  }
  return walks;
}

/** Node2Vec embedding: node id → vector. */
export function node2vec(
  graph: LabeledGraph,
  options: Node2VecOptions = {},
): Record<string, number[]> {
  const opts = { ...NODE2VEC_DEFAULTS, ...options };
  const rng = new SeededRandom(opts.seed);
  const ids = graph.nodes.map((n) => n.id);
  const index = new Map(ids.map((id, i) => [id, i]));
  const walks = generateWalks(graph, opts, rng);

  const counts = new Float64Array(ids.length);
  const pairs: number[] = [];
  for (const walk of walks) {
    const idx = walk.map((id) => index.get(id)!);
    idx.forEach((c, i) => {
      counts[c] = counts[c]! + 1;
      const hi = Math.min(idx.length, i + opts.window + 1);
      for (let j = Math.max(0, i - opts.window); j < hi; j++) if (j !== i) pairs.push(c, idx[j]!);
    });
  }

  const vectors = trainSgns(Int32Array.from(pairs), ids.length, counts, opts, rng);
  return Object.fromEntries(ids.map((id, i) => [id, vectors[i]!]));
}
