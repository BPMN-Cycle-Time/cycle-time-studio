// SLA Benchmark Evaluation engine for process event logs.

import type { Block, Task, EventLogItem, TaskBenchmarkSummary, SlaEvaluationResult } from "@/types";
import { getLeafTime } from "./engine";
import { cleanTaskName } from "@/utils/formats";

/**
 * Resolves standard benchmark duration for an activity/task.
 * Priority: Custom user override > EventLogItem predefined > Task model > BPMN blocks.
 */
export function resolveBenchmarkDuration(
  activity: string,
  taskId?: string,
  customBenchmarks?: Record<string, number>,
  tasks?: Task[],
  blocks?: Block[],
): number {
  const normActivity = activity.trim().toLowerCase();

  // 1. Custom user overrides
  if (customBenchmarks) {
    if (taskId && customBenchmarks[taskId] !== undefined) {
      return customBenchmarks[taskId];
    }
    if (customBenchmarks[activity] !== undefined) {
      return customBenchmarks[activity];
    }
    if (customBenchmarks[normActivity] !== undefined) {
      return customBenchmarks[normActivity];
    }
  }

  // 2. Project tasks
  if (tasks && tasks.length > 0) {
    if (taskId) {
      const matched = tasks.find((t) => t.id === taskId);
      if (matched && typeof matched.time === "number" && matched.time > 0) {
        return matched.time;
      }
    }
    const matchedByName = tasks.find((t) => t.name.trim().toLowerCase() === normActivity);
    if (matchedByName && typeof matchedByName.time === "number" && matchedByName.time > 0) {
      return matchedByName.time;
    }
  }

  // 3. BPMN blocks leaf time
  if (blocks && blocks.length > 0) {
    const searchBlocks = (list: Block[]): number | null => {
      for (const b of list) {
        if (b.taskId === taskId || b.label?.trim().toLowerCase() === normActivity) {
          const t = getLeafTime(b, "time", tasks);
          if (t > 0) return t;
        }
        if (b.branches) {
          for (const br of b.branches) {
            if (br.taskId === taskId || br.label?.trim().toLowerCase() === normActivity) {
              const t = getLeafTime(br, "t", tasks);
              if (t > 0) return t;
            }
            if (br.subBlocks) {
              const found = searchBlocks(br.subBlocks);
              if (found !== null) return found;
            }
          }
        }
        if (b.subBlocks) {
          const found = searchBlocks(b.subBlocks);
          if (found !== null) return found;
        }
      }
      return null;
    };

    const foundTime = searchBlocks(blocks);
    if (foundTime !== null && foundTime > 0) {
      return foundTime;
    }
  }

  return 1;
}

/**
 * Enriches event log items with benchmark durations and SLA status.
 */
export function enrichEventsWithSla(
  events: EventLogItem[],
  customBenchmarks?: Record<string, number>,
  tasks?: Task[],
  blocks?: Block[],
): EventLogItem[] {
  return events.map((item) => {
    // Check if custom benchmark applies
    const hasCustom =
      customBenchmarks &&
      ((item.taskId && customBenchmarks[item.taskId] !== undefined) ||
        customBenchmarks[item.activity] !== undefined ||
        customBenchmarks[item.activity.trim().toLowerCase()] !== undefined);

    const benchmarkDuration = hasCustom
      ? resolveBenchmarkDuration(item.activity, item.taskId, customBenchmarks, tasks, blocks)
      : (item.benchmarkDuration ??
        resolveBenchmarkDuration(item.activity, item.taskId, customBenchmarks, tasks, blocks));

    const slaStatus: "met" | "delayed" = item.duration <= benchmarkDuration ? "met" : "delayed";

    return {
      ...item,
      benchmarkDuration,
      slaStatus,
    };
  });
}

/**
 * Computes aggregated task-level and overall SLA compliance metrics.
 */
export function computeSlaEvaluation(events: EventLogItem[]): SlaEvaluationResult {
  if (events.length === 0) {
    return {
      taskSummaries: [],
      totalInstances: 0,
      totalMet: 0,
      totalDelayed: 0,
      overallComplianceRate: 100,
      topDelayedTasks: [],
    };
  }

  // Group events by task identifier (or activity name)
  const taskGroupMap = new Map<
    string,
    {
      taskId: string;
      taskName: string;
      events: EventLogItem[];
    }
  >();

  for (const evt of events) {
    const groupKey = evt.taskId?.trim() || evt.activity.trim();
    const existing = taskGroupMap.get(groupKey);
    if (existing) {
      existing.events.push(evt);
    } else {
      taskGroupMap.set(groupKey, {
        taskId: evt.taskId?.trim() || `T-${taskGroupMap.size + 1}`,
        taskName: cleanTaskName(evt.activity.trim()),
        events: [evt],
      });
    }
  }

  const taskSummaries: TaskBenchmarkSummary[] = [];

  for (const [, group] of taskGroupMap.entries()) {
    const total = group.events.length;
    let metCount = 0;
    let delayedCount = 0;
    let totalDuration = 0;
    let maxDelay = 0;

    // Benchmark duration for the task group (use the first available or mode)
    const benchmarkDuration = group.events[0]?.benchmarkDuration ?? 1;

    for (const evt of group.events) {
      totalDuration += evt.duration;
      const bDuration = evt.benchmarkDuration ?? benchmarkDuration;
      if (evt.duration <= bDuration) {
        metCount += 1;
      } else {
        delayedCount += 1;
        const delay = evt.duration - bDuration;
        if (delay > maxDelay) maxDelay = delay;
      }
    }

    const complianceRate = total > 0 ? Math.round((metCount / total) * 1000) / 10 : 0;
    const avgActualDuration = total > 0 ? Math.round((totalDuration / total) * 10) / 10 : 0;

    taskSummaries.push({
      taskId: group.taskId,
      taskName: group.taskName,
      benchmarkDuration,
      totalInstances: total,
      metCount,
      delayedCount,
      complianceRate,
      avgActualDuration,
      maxDelay: Math.round(maxDelay * 10) / 10,
    });
  }

  // Sort by Task ID for deterministic table order
  taskSummaries.sort((a, b) => a.taskId.localeCompare(b.taskId, undefined, { numeric: true }));

  const totalInstances = taskSummaries.reduce((sum, t) => sum + t.totalInstances, 0);
  const totalMet = taskSummaries.reduce((sum, t) => sum + t.metCount, 0);
  const totalDelayed = taskSummaries.reduce((sum, t) => sum + t.delayedCount, 0);
  const overallComplianceRate =
    totalInstances > 0 ? Math.round((totalMet / totalInstances) * 1000) / 10 : 100;

  const topDelayedTasks = taskSummaries
    .filter((t) => t.delayedCount > 0)
    .map((t) => ({
      taskId: t.taskId,
      taskName: t.taskName,
      delayedCount: t.delayedCount,
      delayedRate: Math.round((t.delayedCount / t.totalInstances) * 1000) / 10,
    }))
    .sort((a, b) => b.delayedCount - a.delayedCount || b.delayedRate - a.delayedRate);

  return {
    taskSummaries,
    totalInstances,
    totalMet,
    totalDelayed,
    overallComplianceRate,
    topDelayedTasks,
  };
}
