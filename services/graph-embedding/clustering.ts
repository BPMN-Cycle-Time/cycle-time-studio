/** Vector utilities: cosine similarity, k-means (k-means++ init, Lloyd) and 2-D PCA. */
import type { KMeansOptions, KMeansResult } from "@/types";
import { SeededRandom, WeightedSampler } from "./random";

const dot = (a: number[], b: number[]): number => a.reduce((s, v, i) => s + v * (b[i] ?? 0), 0);
const sqDist = (a: number[], b: number[]): number =>
  a.reduce((s, v, i) => s + (v - (b[i] ?? 0)) ** 2, 0);

export function cosineSimilarity(a: number[], b: number[]): number {
  const na = Math.sqrt(dot(a, a));
  const nb = Math.sqrt(dot(b, b));
  return na > 0 && nb > 0 ? dot(a, b) / (na * nb) : 0;
}

function nearest(point: number[], centroids: number[][]): { index: number; dist: number } {
  let index = 0;
  let dist = Infinity;
  centroids.forEach((c, i) => {
    const d = sqDist(point, c);
    if (d < dist) {
      dist = d;
      index = i;
    }
  });
  return { index, dist };
}

function kMeansPlusPlus(vectors: number[][], k: number, rng: SeededRandom): number[][] {
  const centroids = [[...vectors[rng.int(vectors.length)]!]];
  while (centroids.length < k) {
    const weights = vectors.map((v) => nearest(v, centroids).dist);
    const total = weights.reduce((s, w) => s + w, 0);
    const idx = total > 0 ? new WeightedSampler(weights).sample(rng) : rng.int(vectors.length);
    centroids.push([...vectors[idx]!]);
  }
  return centroids;
}

function lloyd(vectors: number[][], init: number[][], maxIter: number): KMeansResult {
  let centroids = init;
  let labels = vectors.map(() => -1);
  for (let iter = 0; iter < maxIter; iter++) {
    const next = vectors.map((v) => nearest(v, centroids).index);
    const changed = next.some((l, i) => l !== labels[i]);
    labels = next;
    centroids = centroids.map((old, c) => {
      const members = vectors.filter((_, i) => labels[i] === c);
      if (!members.length) return old; // keep an empty cluster's centroid in place
      return old.map((_, k) => members.reduce((s, m) => s + m[k]!, 0) / members.length);
    });
    if (!changed) break;
  }
  const inertia = vectors.reduce((s, v, i) => s + sqDist(v, centroids[labels[i]!]!), 0);
  return { labels, centroids, inertia };
}

/** k-means with k-means++ seeding; best (lowest inertia) of `nInit` seeded runs. */
export function kMeans(vectors: number[][], k: number, options: KMeansOptions = {}): KMeansResult {
  const { seed = 0, nInit = 10, maxIter = 100 } = options;
  const clusters = Math.max(1, Math.min(k, vectors.length));
  if (!vectors.length) return { labels: [], centroids: [], inertia: 0 };
  const rng = new SeededRandom(seed);
  let best: KMeansResult | null = null;
  for (let run = 0; run < nInit; run++) {
    const result = lloyd(vectors, kMeansPlusPlus(vectors, clusters, rng), maxIter);
    if (!best || result.inertia < best.inertia) best = result;
  }
  return best!;
}

/** Leading eigenvector of a symmetric matrix by power iteration (deterministic start). */
function powerIteration(matrix: number[][]): number[] {
  const n = matrix.length;
  let v = Array.from({ length: n }, (_, i) => 1 + i / n);
  for (let iter = 0; iter < 500; iter++) {
    const w = matrix.map((row) => dot(row, v));
    const norm = Math.sqrt(dot(w, w));
    if (norm < 1e-15) return v.map(() => 0);
    const next = w.map((x) => x / norm);
    const delta = next.reduce((s, x, i) => s + Math.abs(x - v[i]!), 0);
    v = next;
    if (delta < 1e-12) break;
  }
  // Sign convention: the largest-magnitude component is positive.
  const pivot = v.reduce((best, x) => (Math.abs(x) > Math.abs(best) ? x : best), 0);
  return pivot < 0 ? v.map((x) => -x) : v;
}

/** Projects vectors onto their first two principal components. */
export function pca2d(vectors: number[][]): [number, number][] {
  if (!vectors.length) return [];
  const d = vectors[0]!.length;
  const mean = Array.from(
    { length: d },
    (_, k) => vectors.reduce((s, v) => s + v[k]!, 0) / vectors.length,
  );
  const X = vectors.map((v) => v.map((x, k) => x - mean[k]!));
  const cov = Array.from({ length: d }, (_, i) =>
    Array.from(
      { length: d },
      (_, j) => X.reduce((s, row) => s + row[i]! * row[j]!, 0) / Math.max(1, X.length - 1),
    ),
  );
  const pc1 = powerIteration(cov);
  const lambda1 = dot(
    pc1,
    cov.map((row) => dot(row, pc1)),
  );
  const deflated = cov.map((row, i) => row.map((x, j) => x - lambda1 * pc1[i]! * pc1[j]!));
  const pc2 = powerIteration(deflated);
  return X.map((row) => [dot(row, pc1), dot(row, pc2)]);
}
