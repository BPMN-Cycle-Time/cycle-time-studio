/**
 * Event-log performance analysis: processing time, waiting time, cycle time and cycle time
 * efficiency per activity / resource / case, plus a bottleneck ranking by share of waiting time.
 * All durations are hours, computed from start/complete timestamps (never the rounded `duration`).
 * See docs/FORMULAS.md §Performance.
 */
import type {
  ActivityPerformance,
  CasePerformance,
  DurationStats,
  EventLogItem,
  PerformanceAnalysis,
  PerformanceOptions,
  ResourcePerformance,
} from "@/types";
import { workingHoursBetween } from "./work-calendar";

const MS_PER_HOUR = 3600000;

/** Linear-interpolation quantile on a sorted array (numpy default / Excel PERCENTILE.INC). */
export function quantileSorted(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * p;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (pos - lo);
}

export function computeDurationStats(values: number[]): DurationStats {
  const sorted = [...values].sort((a, b) => a - b);
  const total = sorted.reduce((s, v) => s + v, 0);
  return {
    count: sorted.length,
    mean: sorted.length ? total / sorted.length : 0,
    median: quantileSorted(sorted, 0.5),
    p90: quantileSorted(sorted, 0.9),
    p95: quantileSorted(sorted, 0.95),
    max: sorted.length ? sorted[sorted.length - 1]! : 0,
    total,
  };
}

interface TimedEvent {
  event: EventLogItem;
  index: number;
  start: number;
  end: number;
  processing: number;
  /** Null for the first event of a case. */
  waiting: number | null;
}

/** Groups events by case (first-appearance order) and sorts each case by start, complete, input order. */
function groupCases(events: EventLogItem[]): Map<string, TimedEvent[]> {
  const cases = new Map<string, TimedEvent[]>();
  events.forEach((event, index) => {
    const start = Date.parse(event.startTimestamp);
    const completeRaw = Date.parse(event.completeTimestamp);
    const end = Number.isFinite(completeRaw) ? completeRaw : start;
    const list = cases.get(event.caseId) ?? [];
    list.push({ event, index, start, end, processing: 0, waiting: null });
    cases.set(event.caseId, list);
  });
  for (const list of cases.values()) {
    list.sort((a, b) => a.start - b.start || a.end - b.end || a.index - b.index);
  }
  return cases;
}

/** Ordered activity traces, one per case (same event ordering as the performance analysis). */
export function orderedCaseTraces(events: EventLogItem[]): EventLogItem[][] {
  return [...groupCases(events).values()].map((list) => list.map((item) => item.event));
}

function collectStats<K extends string>(
  items: TimedEvent[],
  keyOf: (e: TimedEvent) => K,
): Map<K, { processing: number[]; waiting: number[] }> {
  const out = new Map<K, { processing: number[]; waiting: number[] }>();
  for (const item of items) {
    const key = keyOf(item);
    const entry = out.get(key) ?? { processing: [], waiting: [] };
    entry.processing.push(item.processing);
    if (item.waiting !== null) entry.waiting.push(item.waiting);
    out.set(key, entry);
  }
  return out;
}

const toPerf = (entry: { processing: number[]; waiting: number[] }) => ({
  processing: computeDurationStats(entry.processing),
  waiting: entry.waiting.length ? computeDurationStats(entry.waiting) : null,
});

/**
 * Analyses processing / waiting time of an event log. With `options.calendar`, every interval
 * only counts its working-time part.
 */
export function analyzePerformance(
  events: EventLogItem[],
  options: PerformanceOptions = {},
): PerformanceAnalysis {
  const { calendar } = options;
  const span = (from: number, to: number): number =>
    calendar ? workingHoursBetween(from, to, calendar) : Math.max(0, to - from) / MS_PER_HOUR;

  const all: TimedEvent[] = [];
  const cases: CasePerformance[] = [];

  for (const [caseId, list] of groupCases(events)) {
    let maxEnd = -Infinity;
    let processingTime = 0;
    let waitingTime = 0;
    for (const item of list) {
      item.processing = span(item.start, item.end);
      if (maxEnd !== -Infinity) {
        item.waiting = span(maxEnd, item.start);
        waitingTime += item.waiting;
      }
      maxEnd = Math.max(maxEnd, item.end);
      processingTime += item.processing;
      all.push(item);
    }
    const caseStart = Math.min(...list.map((e) => e.start));
    const cycleTime = span(caseStart, maxEnd);
    cases.push({
      caseId,
      startTimestamp: new Date(caseStart).toISOString(),
      cycleTime,
      processingTime,
      waitingTime,
      cte: cycleTime > 0 ? processingTime / cycleTime : 0,
    });
  }

  const activities: ActivityPerformance[] = [
    ...collectStats(all, (e) => e.event.activity).entries(),
  ].map(([activity, entry]) => ({ activity, ...toPerf(entry) }));
  const resources: ResourcePerformance[] = [
    ...collectStats(all, (e) => e.event.resource).entries(),
  ].map(([resource, entry]) => ({ resource, ...toPerf(entry) }));

  const totalWaiting = activities.reduce((s, a) => s + (a.waiting?.total ?? 0), 0);
  const waitingShareRanking = activities
    .filter((a) => a.waiting)
    .map((a) => ({
      activity: a.activity,
      share: totalWaiting > 0 ? a.waiting!.total / totalWaiting : 0,
    }))
    .sort((a, b) => b.share - a.share);

  const totalCycle = cases.reduce((s, c) => s + c.cycleTime, 0);
  const totalProcessing = cases.reduce((s, c) => s + c.processingTime, 0);

  return {
    activities,
    resources,
    cases,
    summary: {
      caseCount: cases.length,
      cycleTime: computeDurationStats(cases.map((c) => c.cycleTime)),
      processing: computeDurationStats(cases.map((c) => c.processingTime)),
      waiting: computeDurationStats(cases.map((c) => c.waitingTime)),
      cteOverall: totalCycle > 0 ? totalProcessing / totalCycle : 0,
    },
    waitingShareRanking,
  };
}
