/**
 * BPR detector for waiting-time bottlenecks measured on an uploaded event log:
 * activities whose share of the total waiting time is ≥ 15 % (≥ 30 % = high severity).
 */
import type { BprIssue, BprSeverity, EventLogItem, Task } from "@/types";
import { t } from "@/utils/i18n";
import { analyzePerformance } from "./performance-analysis";

export const LONG_WAIT_SHARE_MEDIUM = 0.15;
export const LONG_WAIT_SHARE_HIGH = 0.3;

const fmt = (value: number): string => value.toFixed(2);

export function detectLongWaitIssues(events: EventLogItem[], tasks?: Task[]): BprIssue[] {
  if (events.length === 0) return [];
  const perf = analyzePerformance(events);
  const byActivity = new Map(perf.activities.map((a) => [a.activity, a]));

  return perf.waitingShareRanking
    .filter((r) => r.share >= LONG_WAIT_SHARE_MEDIUM)
    .map((r) => {
      const waiting = byActivity.get(r.activity)!.waiting!;
      const severity: BprSeverity = r.share >= LONG_WAIT_SHARE_HIGH ? "high" : "medium";
      const task = tasks?.find((x) => x.name.trim().toLowerCase() === r.activity.toLowerCase());
      const values = {
        name: r.activity,
        median: fmt(waiting.median),
        p95: fmt(waiting.p95),
        max: fmt(waiting.max),
        share: (r.share * 100).toFixed(1),
      };
      return {
        id: `wait-${task?.id ?? r.activity}`,
        type: "longWaitTime",
        severity,
        title: t("diagram", "performance.bpr.title", values),
        description: t("diagram", "performance.bpr.description", values),
        evidence: t("diagram", "performance.bpr.evidence", values),
        affectedTaskIds: [task?.id ?? r.activity],
        affectedTaskNames: [r.activity],
      };
    });
}
