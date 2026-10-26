// Graph embedding models: Node2Vec, Weisfeiler–Lehman features / kernel, Graph2Vec anomaly scoring.

/** Generic directed, labelled graph used by every embedding algorithm. */
export interface LabeledGraph {
  nodes: { id: string; label: string }[];
  edges: { source: string; target: string; weight?: number }[];
}

export interface Node2VecOptions {
  dimensions?: number;
  walkLength?: number;
  numWalks?: number;
  p?: number;
  q?: number;
  window?: number;
  negative?: number;
  epochs?: number;
  learningRate?: number;
  minLearningRate?: number;
  seed?: number;
}

export interface Graph2VecOptions {
  dimensions?: number;
  epochs?: number;
  negative?: number;
  learningRate?: number;
  minLearningRate?: number;
  seed?: number;
}

export interface KMeansOptions {
  seed?: number;
  nInit?: number;
  maxIter?: number;
}

export interface KMeansResult {
  labels: number[];
  centroids: number[][];
  inertia: number;
}

export interface TraceGraphOptions {
  /** Append "|SLOW" / "|OK" (waiting time above the per-activity quantile). */
  timeAware?: boolean;
  /** Quantile of the activity's waiting times above which an event is SLOW (default 0.9). */
  slowQuantile?: number;
  /** Event attributes appended to node labels, in order (e.g. ["review_result"]). */
  attributeKeys?: string[];
}

export interface TraceGraph {
  caseId: string;
  graph: LabeledGraph;
}

export interface AnomalyEvaluation {
  byType: Record<string, { count: number; auc: number }>;
  any: { count: number; auc: number };
  precisionAtN: number;
}
