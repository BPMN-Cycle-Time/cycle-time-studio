/** Structural comparison of two process graphs (AS-IS vs TO-BE) with the WL kernel. */
import type { LabeledGraph } from "@/types";
import { cosineSimilarity } from "./clustering";
import { wlKernelSimilarity, wlSubtreeFeatures } from "./wl";

export interface GraphStructureStats {
  nodes: number;
  edges: number;
  /** McCabe cyclomatic complexity E − V + 2P (P = weakly connected components). */
  cyclomatic: number;
}

export interface GraphComparison {
  similarity: number;
  /** WL kernel restricted to the labels of iteration 0..h. */
  perIteration: number[];
  a: GraphStructureStats;
  b: GraphStructureStats;
}

export function graphStructureStats(graph: LabeledGraph): GraphStructureStats {
  const parent = new Map(graph.nodes.map((n) => [n.id, n.id]));
  const find = (x: string): string => {
    let root = x;
    while (parent.get(root) !== root) root = parent.get(root)!;
    parent.set(x, root);
    return root;
  };
  for (const e of graph.edges) {
    if (parent.has(e.source) && parent.has(e.target)) parent.set(find(e.source), find(e.target));
  }
  const components = new Set(graph.nodes.map((n) => find(n.id))).size;
  return {
    nodes: graph.nodes.length,
    edges: graph.edges.length,
    cyclomatic: graph.edges.length - graph.nodes.length + 2 * components,
  };
}

function countVector(features: string[], vocab: string[]): number[] {
  const counts = new Map<string, number>();
  for (const f of features) counts.set(f, (counts.get(f) ?? 0) + 1);
  return vocab.map((f) => counts.get(f) ?? 0);
}

export function compareProcessGraphs(
  a: LabeledGraph,
  b: LabeledGraph,
  iterations = 2,
): GraphComparison {
  const fa = wlSubtreeFeatures(a, iterations);
  const fb = wlSubtreeFeatures(b, iterations);
  const roundOf = (features: string[], size: number, r: number) =>
    features.slice(r * size, (r + 1) * size);
  const perIteration = Array.from({ length: iterations + 1 }, (_, r) => {
    const ra = roundOf(fa, a.nodes.length, r);
    const rb = roundOf(fb, b.nodes.length, r);
    const vocab = [...new Set([...ra, ...rb])];
    return cosineSimilarity(countVector(ra, vocab), countVector(rb, vocab));
  });
  return {
    similarity: wlKernelSimilarity(a, b, iterations),
    perIteration,
    a: graphStructureStats(a),
    b: graphStructureStats(b),
  };
}
