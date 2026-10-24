// RPA / Automation Opportunity Detection Service.
// Identifies repetitive, predictable, high-volume tasks that are good candidates
// for Robotic Process Automation or other forms of automation.

import type {
  AutomationAnalysis,
  AutomationCandidate,
  AutomationScore,
  AutomationTag,
  EventLogItem,
} from "@/types";

const RULE_BASED_KEYWORDS = [
  "data entry",
  "copy",
  "paste",
  "sync",
  "export",
  "import",
  "validate",
  "check",
  "verify",
  "update",
  "reconcile",
  "format",
  "send",
  "email",
  "notification",
  "extract",
  "generate",
  "nhap lieu",
  "sao chep",
  "dong bo",
  "xuat",
  "nhap",
  "xac thuc",
  "kiem tra",
  "cap nhat",
  "doi chieu",
  "trich xuat",
];

const SYSTEM_RESOURCES = ["system", "service", "api", "bot", "robot", "automation", "he thong"];

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function ruleBasedScore(activity: string): number {
  const normalized = activity.toLowerCase();
  for (const kw of RULE_BASED_KEYWORDS) {
    if (normalized.includes(kw.toLowerCase())) return 80;
  }
  return 20;
}

function systemInteractionScore(resource?: string | null): number {
  if (!resource) return 30;
  const normalized = resource.toLowerCase();
  for (const sys of SYSTEM_RESOURCES) {
    if (normalized.includes(sys)) return 90;
  }
  return 30;
}

function computeCandidate(
  activity: string,
  events: EventLogItem[],
  maxFreq: number,
  totalProcessDuration: number,
): AutomationCandidate {
  const durations = events.map((e) => e.duration);
  const frequency = events.length;
  const avgDuration = durations.reduce((s, d) => s + d, 0) / frequency;
  const totalDuration = durations.reduce((s, d) => s + d, 0);

  const freqScore = maxFreq > 0 ? (frequency / maxFreq) * 100 : 0;

  const sd = stdDev(durations);
  const coeffVar = avgDuration > 0 ? sd / avgDuration : 0;
  const predictabilityScore = clamp(100 - coeffVar * 100);

  const ruleScore = ruleBasedScore(activity);
  const sysScore = systemInteractionScore(events[0]?.resource);
  const timeSavingsScore =
    totalProcessDuration > 0 ? (totalDuration / totalProcessDuration) * 100 : 0;

  const weights = {
    frequency: 0.25,
    predictability: 0.2,
    ruleBased: 0.15,
    systemInteraction: 0.15,
    timeSavings: 0.25,
  };

  const composite =
    freqScore * weights.frequency +
    predictabilityScore * weights.predictability +
    ruleScore * weights.ruleBased +
    sysScore * weights.systemInteraction +
    timeSavingsScore * weights.timeSavings;

  const score: AutomationScore = {
    frequency: Math.round(freqScore * 10) / 10,
    predictability: Math.round(predictabilityScore * 10) / 10,
    ruleBased: ruleScore,
    systemInteraction: sysScore,
    timeSavings: Math.round(timeSavingsScore * 10) / 10,
    composite: Math.round(composite * 10) / 10,
  };

  const tags: AutomationTag[] = [];
  if (score.frequency >= 70) tags.push("highFrequency");
  if (score.predictability >= 70) tags.push("lowVariance");
  if (score.ruleBased >= 70) tags.push("ruleBased");
  if (score.systemInteraction >= 70) tags.push("systemTask");
  if (score.timeSavings >= 70) tags.push("highTimeSavings");

  return {
    id: `auto_${activity.replace(/\W+/g, "_").toLowerCase()}`,
    activity: cleanActivityName(activity),
    taskId: events[0]?.taskId,
    frequency,
    avgDuration: Math.round(avgDuration * 100) / 100,
    totalDuration: Math.round(totalDuration * 100) / 100,
    score,
    estimatedHoursSaved: Math.round(totalDuration * 0.5 * 100) / 100,
    tags,
  };
}

function cleanActivityName(name: string): string {
  return name.replace(/_/g, " ").trim();
}

export function analyzeAutomationOpportunities(events: EventLogItem[]): AutomationAnalysis {
  if (!events.length) {
    return {
      candidates: [],
      totalCandidates: 0,
      totalEstimatedHoursSaved: 0,
      topCandidate: null,
    };
  }

  const totalProcessDuration = events.reduce((s, e) => s + e.duration, 0);

  const activityGroups = new Map<string, EventLogItem[]>();
  for (const e of events) {
    const list = activityGroups.get(e.activity) || [];
    list.push(e);
    activityGroups.set(e.activity, list);
  }

  const maxFreq = Math.max(1, ...Array.from(activityGroups.values()).map((list) => list.length));

  const candidates = Array.from(activityGroups.entries())
    .map(([activity, group]) => computeCandidate(activity, group, maxFreq, totalProcessDuration))
    .sort((a, b) => b.score.composite - a.score.composite);

  const totalEstimatedHoursSaved = candidates.reduce((s, c) => s + c.estimatedHoursSaved, 0);

  return {
    candidates,
    totalCandidates: candidates.length,
    totalEstimatedHoursSaved: Math.round(totalEstimatedHoursSaved * 100) / 100,
    topCandidate: candidates[0] || null,
  };
}
