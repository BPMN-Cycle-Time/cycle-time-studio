"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { EmbeddingJobRequest, EmbeddingJobResult, EmbeddingJobResponse } from "@/types";

export class EmbeddingJobCancelledError extends Error {
  constructor() {
    super("cancelled");
    this.name = "EmbeddingJobCancelledError";
  }
}

interface PendingJob {
  id: number;
  resolve: (result: EmbeddingJobResult) => void;
  reject: (error: Error) => void;
}

/**
 * Runs graph-embedding jobs in a Web Worker, one at a time. `cancel()` terminates the worker
 * (rejecting the pending job with EmbeddingJobCancelledError); a fresh worker is created lazily.
 */
export function useGraphEmbeddingWorker() {
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<PendingJob | null>(null);
  const nextIdRef = useRef(1);
  const [running, setRunning] = useState(false);

  const settle = useCallback(() => {
    pendingRef.current = null;
    setRunning(false);
  }, []);

  const getWorker = useCallback((): Worker => {
    if (workerRef.current) return workerRef.current;
    const worker = new Worker(new URL("./graph-embedding.worker.ts", import.meta.url));
    worker.onmessage = (event: MessageEvent<EmbeddingJobResponse>) => {
      const pending = pendingRef.current;
      if (!pending || pending.id !== event.data.id) return;
      settle();
      if (event.data.ok) pending.resolve(event.data.result);
      else pending.reject(new Error(event.data.error));
    };
    worker.onerror = (event) => {
      const pending = pendingRef.current;
      settle();
      pending?.reject(new Error(event.message));
    };
    workerRef.current = worker;
    return worker;
  }, [settle]);

  const cancel = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
    const pending = pendingRef.current;
    settle();
    pending?.reject(new EmbeddingJobCancelledError());
  }, [settle]);

  const run = useCallback(
    (request: EmbeddingJobRequest): Promise<EmbeddingJobResult> => {
      if (pendingRef.current) cancel();
      const id = nextIdRef.current++;
      return new Promise<EmbeddingJobResult>((resolve, reject) => {
        pendingRef.current = { id, resolve, reject };
        setRunning(true);
        getWorker().postMessage({ id, request });
      });
    },
    [cancel, getWorker],
  );

  useEffect(
    () => () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    },
    [],
  );

  return { run, cancel, running };
}
