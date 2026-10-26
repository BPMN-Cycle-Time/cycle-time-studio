/**
 * Event log → one chain graph per case: START → e1 → … → en → END, node label = activity
 * (+ "|SLOW"/"|OK" waiting level, + selected attribute values).
 */
import type { EventLogItem, LabeledGraph, TraceGraph, TraceGraphOptions } from "@/types";
import { orderedCaseTraces, quantileSorted } from "../performance-analysis";

const MS_PER_HOUR = 3600000;

/** Waiting time (h) per event of an ordered case; null for the first event. */
function caseWaits(trace: EventLogItem[]): (number | null)[] {
  let maxEnd = -Infinity;
  return trace.map((e) => {
    const start = Date.parse(e.startTimestamp);
    const endRaw = Date.parse(e.completeTimestamp);
    const end = Number.isFinite(endRaw) ? endRaw : start;
    const wait = maxEnd === -Infinity ? null : Math.max(0, (start - maxEnd) / MS_PER_HOUR);
    maxEnd = Math.max(maxEnd, end);
    return wait;
  });
}

export function buildTraceGraphs(
  events: EventLogItem[],
  options: TraceGraphOptions = {},
): TraceGraph[] {
  const { timeAware = false, slowQuantile = 0.9, attributeKeys = [] } = options;
  const traces = orderedCaseTraces(events).sort((a, b) =>
    a[0]!.caseId < b[0]!.caseId ? -1 : a[0]!.caseId > b[0]!.caseId ? 1 : 0,
  );
  const waits = traces.map(caseWaits);

  // Per-activity SLOW threshold = quantile of that activity's waiting times in the whole log.
  const threshold = new Map<string, number>();
  if (timeAware) {
    const byActivity = new Map<string, number[]>();
    traces.forEach((trace, c) =>
      trace.forEach((e, i) => {
        const w = waits[c]![i];
        if (w === null || w === undefined) return;
        byActivity.set(e.activity, [...(byActivity.get(e.activity) ?? []), w]);
      }),
    );
    for (const [activity, list] of byActivity) {
      threshold.set(
        activity,
        quantileSorted(
          [...list].sort((a, b) => a - b),
          slowQuantile,
        ),
      );
    }
  }

  return traces.map((trace, c) => {
    const caseId = trace[0]!.caseId;
    const labels = trace.map((e, i) => {
      let label = e.activity;
      if (timeAware) {
        const w = waits[c]![i];
        const slow =
          w !== null && w !== undefined && w > 0 && w > (threshold.get(e.activity) ?? Infinity);
        label += slow ? "|SLOW" : "|OK";
      }
      for (const key of attributeKeys) {
        const value = e.attributes?.[key];
        if (value) label += `|${value}`;
      }
      return label;
    });
    const all = ["START", ...labels, "END"];
    const graph: LabeledGraph = {
      nodes: all.map((label, i) => ({ id: `${caseId}#${i}`, label })),
      edges: all
        .slice(1)
        .map((_, i) => ({ source: `${caseId}#${i}`, target: `${caseId}#${i + 1}` })),
    };
    return { caseId, graph };
  });
}
