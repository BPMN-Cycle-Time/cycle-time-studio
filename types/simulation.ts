// Monte Carlo simulation results models.

export interface MonteCarloResult {
  samples: number[];
  mean: number;
  p50: number;
  p85: number;
  p95: number;
  min: number;
  max: number;
  /** Histogram buckets for charting. */
  histogram: { x0: number; x1: number; count: number }[];
}
