/** kNN anomaly scores on embeddings and their evaluation against labelled ground truth. */
import type { AnomalyEvaluation } from "@/types";

/** Mean cosine distance to the min(k, n−1) nearest other vectors (higher = more anomalous). */
export function knnAnomalyScores(vectors: number[][], k = 20): number[] {
  const unit = vectors.map((v) => {
    const norm = Math.max(Math.sqrt(v.reduce((s, x) => s + x * x, 0)), 1e-12);
    return v.map((x) => x / norm);
  });
  const kk = Math.min(k, unit.length - 1);
  if (kk <= 0) return unit.map(() => 0);
  return unit.map((a, i) => {
    const sims = unit
      .filter((_, j) => j !== i)
      .map((b) => a.reduce((s, x, d) => s + x * b[d]!, 0))
      .sort((x, y) => y - x);
    return sims.slice(0, kk).reduce((s, sim) => s + (1 - sim), 0) / kk;
  });
}

/** Ground-truth CSV (case_id, anomaly_types separated by ";") → caseId → types. */
export function parseGroundTruthCsv(text: string): Record<string, string[]> {
  const rows = text.replace(/^﻿/, "").trim().split(/\r?\n/);
  const header = (rows[0] ?? "").split(",").map((h) => h.trim().toLowerCase());
  const caseCol = Math.max(0, header.indexOf("case_id"));
  const typeCol = header.indexOf("anomaly_types") === -1 ? 1 : header.indexOf("anomaly_types");
  const out: Record<string, string[]> = {};
  for (const row of rows.slice(1)) {
    const cells = row.split(",");
    const caseId = cells[caseCol]?.trim();
    if (!caseId) continue;
    out[caseId] = (cells[typeCol] ?? "")
      .split(";")
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return out;
}

/** Mann–Whitney AUC: P(score_pos > score_neg), ties count 0.5. */
function auc(pos: number[], neg: number[]): number {
  if (!pos.length || !neg.length) return 0.5;
  let wins = 0;
  for (const p of pos) for (const n of neg) wins += p > n ? 1 : p === n ? 0.5 : 0;
  return wins / (pos.length * neg.length);
}

/**
 * AUC per anomaly type (cases with that type vs cases without any label), AUC of any label, and
 * precision@N (N = labelled cases; ties broken by caseId). Scores are rounded to 9 decimals first.
 */
export function evaluateAnomalyScores(
  caseIds: string[],
  scores: number[],
  groundTruth: Record<string, string[]>,
): AnomalyEvaluation {
  const rounded = scores.map((s) => Math.round(s * 1e9) / 1e9);
  const typesOf = (i: number): string[] => groundTruth[caseIds[i]!] ?? [];
  const normal = rounded.filter((_, i) => typesOf(i).length === 0);
  const anomalous = caseIds.map((_, i) => i).filter((i) => typesOf(i).length > 0);

  const types = [...new Set(caseIds.flatMap((_, i) => typesOf(i)))].sort();
  const byType: AnomalyEvaluation["byType"] = {};
  for (const type of types) {
    const pos = rounded.filter((_, i) => typesOf(i).includes(type));
    byType[type] = { count: pos.length, auc: auc(pos, normal) };
  }

  const order = caseIds
    .map((_, i) => i)
    .sort((a, b) => rounded[b]! - rounded[a]! || (caseIds[a]! < caseIds[b]! ? -1 : 1));
  const top = new Set(order.slice(0, anomalous.length));
  const hits = anomalous.filter((i) => top.has(i)).length;

  return {
    byType,
    any: {
      count: anomalous.length,
      auc: auc(
        anomalous.map((i) => rounded[i]!),
        normal,
      ),
    },
    precisionAtN: anomalous.length ? hits / anomalous.length : 0,
  };
}
