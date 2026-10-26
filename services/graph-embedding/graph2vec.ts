/** Graph2Vec (Narayanan et al. 2017): PV-DBOW over WL feature "documents", one vector per graph. */
import type { Graph2VecOptions } from "@/types";
import { SeededRandom } from "./random";
import { trainSgns } from "./sgns";

export const GRAPH2VEC_DEFAULTS: Required<Graph2VecOptions> = {
  dimensions: 32,
  epochs: 200,
  negative: 5,
  learningRate: 0.025,
  minLearningRate: 0.0001,
  seed: 42,
};

export function graph2vec(docs: string[][], options: Graph2VecOptions = {}): number[][] {
  const opts = { ...GRAPH2VEC_DEFAULTS, ...options };
  const vocab = new Map<string, number>();
  const counts: number[] = [];
  const pairs: number[] = [];
  docs.forEach((doc, d) => {
    for (const feature of doc) {
      let w = vocab.get(feature);
      if (w === undefined) {
        w = vocab.size;
        vocab.set(feature, w);
        counts.push(0);
      }
      counts[w] = counts[w]! + 1;
      pairs.push(d, w);
    }
  });
  if (!docs.length) return [];
  return trainSgns(Int32Array.from(pairs), docs.length, counts, opts, new SeededRandom(opts.seed));
}
