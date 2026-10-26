/**
 * Dispatcher for the long-running embedding computations. Pure and synchronous — the Graph
 * Embedding tab runs it inside a Web Worker (hooks/execute/graph-embedding.worker.ts).
 */
import type {
  EmbeddingJobRequest,
  EmbeddingJobResult,
  EventLogItem,
  TraceEmbeddingSettings,
  TraceGraphOptions,
  TraceLabelMode,
} from "@/types";
import { kMeans, pca2d } from "./clustering";
import { graph2vec } from "./graph2vec";
import { knnAnomalyScores } from "./anomaly";
import { node2vec } from "./node2vec";
import { buildTraceGraphs } from "./trace-graphs";
import { wlKernelVectors, wlSubtreeFeatures } from "./wl";

export const TRACE_LABEL_MODES: TraceLabelMode[] = ["structure", "timeAware", "timeAndAttributes"];

export function traceGraphOptions(
  mode: TraceLabelMode,
  settings: Pick<TraceEmbeddingSettings, "slowQuantile" | "attributeKeys">,
): TraceGraphOptions {
  return {
    timeAware: mode !== "structure",
    slowQuantile: settings.slowQuantile,
    attributeKeys: mode === "timeAndAttributes" ? settings.attributeKeys : [],
  };
}

function embedTraces(
  events: EventLogItem[],
  mode: TraceLabelMode,
  settings: TraceEmbeddingSettings,
) {
  const traces = buildTraceGraphs(events, traceGraphOptions(mode, settings));
  const docs = traces.map((t) => wlSubtreeFeatures(t.graph, 2));
  const vectors =
    settings.method === "graph2vec" ? graph2vec(docs, settings.graph2vec) : wlKernelVectors(docs);
  return { traces, vectors, scores: knnAnomalyScores(vectors, settings.k) };
}

export function runEmbeddingJob(request: EmbeddingJobRequest): EmbeddingJobResult {
  switch (request.kind) {
    case "node2vec": {
      const embedding = node2vec(request.graph, request.options);
      const ids = request.graph.nodes.map((n) => n.id);
      const vectors = ids.map((id) => embedding[id]!);
      const clusters = kMeans(vectors, request.clusters, {
        seed: request.options.seed ?? 0,
      }).labels;
      return { kind: "node2vec", ids, vectors, clusters, points: pca2d(vectors) };
    }
    case "traceEmbedding": {
      const { traces, vectors, scores } = embedTraces(
        request.events,
        request.mode,
        request.settings,
      );
      const cases = traces.map(({ caseId, graph }, i) => {
        const inner = graph.nodes.slice(1, -1).map((n) => n.label);
        return {
          caseId,
          score: scores[i]!,
          eventCount: inner.length,
          slowCount: inner.filter((l) => l.includes("|SLOW")).length,
          activities: inner.map((l) => l.split("|")[0]!),
        };
      });
      return { kind: "traceEmbedding", cases, points: pca2d(vectors) };
    }
    case "compareLabelModes": {
      const runs = TRACE_LABEL_MODES.map((mode) =>
        embedTraces(request.events, mode, request.settings),
      );
      return {
        kind: "compareLabelModes",
        caseIds: runs[0]!.traces.map((t) => t.caseId),
        scores: {
          structure: runs[0]!.scores,
          timeAware: runs[1]!.scores,
          timeAndAttributes: runs[2]!.scores,
        },
      };
    }
  }
}
