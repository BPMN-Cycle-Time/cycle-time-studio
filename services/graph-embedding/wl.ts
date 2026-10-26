/**
 * Weisfeiler–Lehman subtree features (directed: in- and out-neighbour multisets), the TF-IDF
 * WL-kernel embedding (= scikit-learn TfidfVectorizer(sublinear_tf=True)) and the WL kernel.
 */
import type { LabeledGraph } from "@/types";
import { cosineSimilarity } from "./clustering";

/**
 * Multiset of WL labels of every node at every iteration 0..h. Relabelling is injective: the new
 * label is the full signature string (old label + sorted in / out neighbour labels) prefixed with
 * the iteration, so equal structures get equal labels across graphs and iterations never collide.
 */
export function wlSubtreeFeatures(graph: LabeledGraph, iterations = 2): string[] {
  const index = new Map(graph.nodes.map((n, i) => [n.id, i]));
  const ins: number[][] = graph.nodes.map(() => []);
  const outs: number[][] = graph.nodes.map(() => []);
  for (const e of graph.edges) {
    const s = index.get(e.source);
    const t = index.get(e.target);
    if (s === undefined || t === undefined) continue;
    outs[s]!.push(t);
    ins[t]!.push(s);
  }
  let labels = graph.nodes.map((n) => n.label);
  const features = [...labels];
  for (let it = 1; it <= iterations; it++) {
    const prev = labels;
    const multiset = (list: number[]): string => JSON.stringify(list.map((j) => prev[j]!).sort());
    labels = prev.map(
      (label, i) =>
        `\u0001wl${it}(${JSON.stringify(label)},in:${multiset(ins[i]!)},out:${multiset(outs[i]!)})`,
    );
    features.push(...labels);
  }
  return features;
}

function countFeatures(doc: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const f of doc) counts.set(f, (counts.get(f) ?? 0) + 1);
  return counts;
}

/** Sublinear TF-IDF rows (tf = 1 + ln count, idf = ln((1+n)/(1+df)) + 1), L2-normalised. */
export function wlKernelVectors(docs: string[][]): number[][] {
  const counts = docs.map(countFeatures);
  const df = new Map<string, number>();
  for (const c of counts) for (const f of c.keys()) df.set(f, (df.get(f) ?? 0) + 1);
  const vocab = [...df.keys()].sort();
  const col = new Map(vocab.map((f, i) => [f, i]));
  const n = docs.length;
  return counts.map((c) => {
    const row = new Array<number>(vocab.length).fill(0);
    for (const [f, count] of c) {
      row[col.get(f)!] = (1 + Math.log(count)) * (Math.log((1 + n) / (1 + df.get(f)!)) + 1);
    }
    const norm = Math.sqrt(row.reduce((s, v) => s + v * v, 0));
    return norm > 0 ? row.map((v) => v / norm) : row;
  });
}

/** WL kernel: cosine between raw WL feature count vectors of two graphs. */
export function wlKernelSimilarity(a: LabeledGraph, b: LabeledGraph, iterations = 2): number {
  const ca = countFeatures(wlSubtreeFeatures(a, iterations));
  const cb = countFeatures(wlSubtreeFeatures(b, iterations));
  const vocab = [...new Set([...ca.keys(), ...cb.keys()])];
  return cosineSimilarity(
    vocab.map((f) => ca.get(f) ?? 0),
    vocab.map((f) => cb.get(f) ?? 0),
  );
}
