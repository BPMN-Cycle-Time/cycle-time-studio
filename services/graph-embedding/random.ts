/** Seeded pseudo-random numbers (mulberry32) — embeddings never use Math.random. */
export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** Uniform float in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Uniform integer in [0, n). */
  int(n: number): number {
    return Math.floor(this.next() * n);
  }

  /** In-place Fisher–Yates shuffle. */
  shuffle<T>(items: T[]): T[] {
    for (let i = items.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      const tmp = items[i]!;
      items[i] = items[j]!;
      items[j] = tmp;
    }
    return items;
  }
}

/** Index drawn proportionally to non-negative `weights` (cumulative sums + binary search). */
export class WeightedSampler {
  private readonly cumulative: Float64Array;

  constructor(weights: ArrayLike<number>) {
    this.cumulative = new Float64Array(weights.length);
    let sum = 0;
    for (let i = 0; i < weights.length; i++) {
      sum += Math.max(0, weights[i]!);
      this.cumulative[i] = sum;
    }
  }

  sample(rng: SeededRandom): number {
    const n = this.cumulative.length;
    const target = rng.next() * this.cumulative[n - 1]!;
    let lo = 0;
    let hi = n - 1;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this.cumulative[mid]! > target) hi = mid;
      else lo = mid + 1;
    }
    return lo;
  }
}
