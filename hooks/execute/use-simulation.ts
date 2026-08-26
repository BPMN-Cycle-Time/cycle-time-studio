"use client";

import { useState, useCallback } from "react";
import type { Block, MonteCarloResult } from "@/types";
import { runMonteCarlo } from "@/utils";

/**
 * Custom execution hook for managing Monte Carlo simulation execution state.
 */
export function useSimulation(blocks: Block[], iterations = 5000) {
  const [result, setResult] = useState<MonteCarloResult | null>(null);
  const [running, setRunning] = useState(false);

  const execute = useCallback(() => {
    if (blocks.length === 0) return;
    setRunning(true);
    setTimeout(() => {
      setResult(runMonteCarlo(blocks, iterations));
      setRunning(false);
    }, 10);
  }, [blocks, iterations]);

  return { result, running, execute };
}
