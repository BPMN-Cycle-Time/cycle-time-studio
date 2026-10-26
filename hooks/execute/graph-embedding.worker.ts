/** Web Worker running graph-embedding jobs off the main thread. */
import { runEmbeddingJob } from "@/services/graph-embedding/jobs";
import type { EmbeddingJobRequest, EmbeddingJobResponse } from "@/types";

interface EmbeddingWorkerScope {
  onmessage: ((event: MessageEvent<{ id: number; request: EmbeddingJobRequest }>) => void) | null;
  postMessage: (message: EmbeddingJobResponse) => void;
}

const scope = self as unknown as EmbeddingWorkerScope;

scope.onmessage = (event) => {
  const { id, request } = event.data;
  try {
    scope.postMessage({ id, ok: true, result: runEmbeddingJob(request) });
  } catch (err) {
    scope.postMessage({ id, ok: false, error: err instanceof Error ? err.message : String(err) });
  }
};
