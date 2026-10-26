/**
 * Skip-gram with negative sampling (word2vec SGNS), shared by Node2Vec (node → context node)
 * and Graph2Vec / PV-DBOW (graph → WL feature).
 */
import { SeededRandom, WeightedSampler } from "./random";

export interface SgnsOptions {
  dimensions: number;
  negative: number;
  epochs: number;
  learningRate: number;
  minLearningRate: number;
}

const sigmoid = (z: number): number => 1 / (1 + Math.exp(-Math.min(10, Math.max(-10, z))));

/**
 * Trains input vectors for `inputCount` inputs from (input, output) index pairs.
 * Input vectors start uniform(−0.5/d, 0.5/d), output vectors at 0; negatives follow
 * `outputCounts`^0.75; pairs are reshuffled every epoch; the learning rate decays linearly
 * over all updates. Returns one vector per input.
 */
export function trainSgns(
  pairs: Int32Array,
  inputCount: number,
  outputCounts: ArrayLike<number>,
  options: SgnsOptions,
  rng: SeededRandom,
): number[][] {
  const d = options.dimensions;
  const outputCount = outputCounts.length;
  const W = new Float64Array(inputCount * d);
  for (let i = 0; i < W.length; i++) W[i] = (rng.next() - 0.5) / d;
  const C = new Float64Array(outputCount * d);

  const noise = new WeightedSampler(Array.from(outputCounts, (c) => Math.pow(c, 0.75)));
  const pairCount = pairs.length / 2;
  const order = Array.from({ length: pairCount }, (_, i) => i);
  const total = Math.max(1, options.epochs * pairCount);
  const grad = new Float64Array(d);
  let step = 0;

  for (let epoch = 0; epoch < options.epochs; epoch++) {
    rng.shuffle(order);
    for (const pairIdx of order) {
      const lr =
        options.learningRate - ((options.learningRate - options.minLearningRate) * step) / total;
      step++;
      const inOff = pairs[2 * pairIdx]! * d;
      grad.fill(0);
      for (let s = 0; s <= options.negative; s++) {
        const target = s === 0 ? pairs[2 * pairIdx + 1]! : noise.sample(rng);
        const label = s === 0 ? 1 : 0;
        const outOff = target * d;
        let dot = 0;
        for (let k = 0; k < d; k++) dot += W[inOff + k]! * C[outOff + k]!;
        const g = (label - sigmoid(dot)) * lr;
        for (let k = 0; k < d; k++) {
          grad[k] = grad[k]! + g * C[outOff + k]!;
          C[outOff + k] = C[outOff + k]! + g * W[inOff + k]!;
        }
      }
      for (let k = 0; k < d; k++) W[inOff + k] = W[inOff + k]! + grad[k]!;
    }
  }

  return Array.from({ length: inputCount }, (_, i) => Array.from(W.subarray(i * d, (i + 1) * d)));
}
