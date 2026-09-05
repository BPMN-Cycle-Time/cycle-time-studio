import {
  BlockType,
  BlockMode,
  type Block,
  type Branch,
  type Task,
  type EventLogItem,
  type EventLogConfig,
  type EventLogSummary,
} from "@/types";
import { getLeafCost, getLeafTime } from "./engine";

const DEFAULT_ROLES = [
  "Clerk",
  "Specialist",
  "Senior Analyst",
  "Reviewer",
  "Department Manager",
  "Finance Officer",
  "System / Service",
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function resolveResource(
  holder: { resource?: string; label?: string; taskId?: string | null; id?: string },
  tasks?: Task[],
): string {
  if (holder.resource?.trim()) return holder.resource.trim();

  if (holder.taskId && tasks) {
    const task = tasks.find((t) => t.id === holder.taskId);
    if (task?.resource?.trim()) return task.resource.trim();
  }

  // Infer deterministic role based on label / task name
  const text = (holder.label || holder.id || "task").toLowerCase();
  if (text.includes("approve") || text.includes("phê duyệt") || text.includes("manager")) {
    return "Department Manager";
  }
  if (
    text.includes("check") ||
    text.includes("review") ||
    text.includes("kiểm tra") ||
    text.includes("thẩm định")
  ) {
    return "Reviewer";
  }
  if (
    text.includes("finance") ||
    text.includes("payment") ||
    text.includes("invoice") ||
    text.includes("thanh toán")
  ) {
    return "Finance Officer";
  }
  if (
    text.includes("auto") ||
    text.includes("system") ||
    text.includes("api") ||
    text.includes("hệ thống")
  ) {
    return "System / Service";
  }
  if (text.includes("analyze") || text.includes("phân tích") || text.includes("đánh giá")) {
    return "Senior Analyst";
  }

  const idx = hashString(text) % (DEFAULT_ROLES.length - 1);
  return DEFAULT_ROLES[idx];
}

function getUnitMultiplierMs(unit: string): number {
  const u = unit.toLowerCase();
  if (u.startsWith("day") || u.startsWith("ngày")) return 8 * 3600 * 1000;
  if (u.startsWith("sec") || u.startsWith("giây")) return 1000;
  if (u.startsWith("min") || u.startsWith("phút")) return 60 * 1000;
  return 3600 * 1000; // default hours
}

function applyVariance(base: number, variancePct: number): number {
  if (variancePct <= 0 || base <= 0) return base;
  const factor = 1 + ((Math.random() * 2 - 1) * variancePct) / 100;
  return Math.max(0.01, Math.round(base * factor * 100) / 100);
}

interface TraverseContext {
  caseId: string;
  tasks?: Task[];
  unitMs: number;
  variancePct: number;
  events: EventLogItem[];
  eventSeq: number;
}

function traverseBranch(branch: Branch, startTimeMs: number, ctx: TraverseContext): number {
  if (branch.mode === BlockMode.COMPOSITE && branch.subBlocks) {
    return traverseBlocks(branch.subBlocks, startTimeMs, ctx);
  }

  const baseTime = getLeafTime(branch, "t", ctx.tasks);
  const duration = applyVariance(baseTime, ctx.variancePct);
  const durationMs = Math.max(1000, duration * ctx.unitMs);
  const endTimeMs = startTimeMs + durationMs;

  const costResult = getLeafCost(branch, ctx.tasks);
  const resource = resolveResource(branch, ctx.tasks);

  ctx.eventSeq += 1;
  ctx.events.push({
    id: `${ctx.caseId}-evt-${ctx.eventSeq}`,
    caseId: ctx.caseId,
    activity: branch.label || "Branch Task",
    resource,
    startTimestamp: new Date(startTimeMs).toISOString(),
    completeTimestamp: new Date(endTimeMs).toISOString(),
    duration,
    cost: Math.round(costResult.total * 100) / 100,
    taskId: branch.taskId || undefined,
    blockId: branch.id,
  });

  return endTimeMs;
}

function traverseBlock(block: Block, startTimeMs: number, ctx: TraverseContext): number {
  switch (block.type) {
    case BlockType.SEQ: {
      if (block.mode === BlockMode.COMPOSITE && block.subBlocks) {
        return traverseBlocks(block.subBlocks, startTimeMs, ctx);
      }
      const baseTime = getLeafTime(block, "time", ctx.tasks);
      const duration = applyVariance(baseTime, ctx.variancePct);
      const durationMs = Math.max(1000, duration * ctx.unitMs);
      const endTimeMs = startTimeMs + durationMs;

      const costResult = getLeafCost(block, ctx.tasks);
      const resource = resolveResource(block, ctx.tasks);

      ctx.eventSeq += 1;
      ctx.events.push({
        id: `${ctx.caseId}-evt-${ctx.eventSeq}`,
        caseId: ctx.caseId,
        activity: block.label || "Task",
        resource,
        startTimestamp: new Date(startTimeMs).toISOString(),
        completeTimestamp: new Date(endTimeMs).toISOString(),
        duration,
        cost: Math.round(costResult.total * 100) / 100,
        taskId: block.taskId || undefined,
        blockId: block.id,
      });

      return endTimeMs;
    }

    case BlockType.XOR: {
      const branches = block.branches ?? [];
      if (branches.length === 0) return startTimeMs;

      const totalP = branches.reduce((s, b) => s + (b.p ?? 0), 0) || 100;
      const roll = Math.random() * totalP;
      let acc = 0;
      let chosen = branches[0];
      for (const br of branches) {
        acc += br.p ?? 0;
        if (roll <= acc) {
          chosen = br;
          break;
        }
      }
      return traverseBranch(chosen, startTimeMs, ctx);
    }

    case BlockType.AND: {
      const branches = block.branches ?? [];
      if (branches.length === 0) return startTimeMs;

      let maxEnd = startTimeMs;
      for (const br of branches) {
        const brEnd = traverseBranch(br, startTimeMs, ctx);
        if (brEnd > maxEnd) maxEnd = brEnd;
      }
      return maxEnd;
    }

    case BlockType.LOOP: {
      const rawR = block.loopP ?? 0;
      const p = Math.min(0.95, Math.max(0, rawR / 100));

      let currStart = startTimeMs;
      let iter = 0;
      do {
        if (block.mode === BlockMode.COMPOSITE && block.subBlocks) {
          currStart = traverseBlocks(block.subBlocks, currStart, ctx);
        } else {
          const baseTime = getLeafTime(block, "loopTime", ctx.tasks);
          const duration = applyVariance(baseTime, ctx.variancePct);
          const durationMs = Math.max(1000, duration * ctx.unitMs);
          const endTimeMs = currStart + durationMs;

          const costResult = getLeafCost(block, ctx.tasks);
          const resource = resolveResource(block, ctx.tasks);

          ctx.eventSeq += 1;
          ctx.events.push({
            id: `${ctx.caseId}-evt-${ctx.eventSeq}`,
            caseId: ctx.caseId,
            activity: iter > 0 ? `${block.label} (Rework #${iter})` : block.label,
            resource,
            startTimestamp: new Date(currStart).toISOString(),
            completeTimestamp: new Date(endTimeMs).toISOString(),
            duration,
            cost: Math.round(costResult.total * 100) / 100,
            taskId: block.taskId || undefined,
            blockId: block.id,
          });

          currStart = endTimeMs;
        }
        iter += 1;
      } while (Math.random() < p && iter < 10);

      return currStart;
    }

    default:
      return startTimeMs;
  }
}

function traverseBlocks(blocks: Block[], startTimeMs: number, ctx: TraverseContext): number {
  let curr = startTimeMs;
  for (const b of blocks) {
    curr = traverseBlock(b, curr, ctx);
  }
  return curr;
}

export function generateEventLog(
  blocks: Block[],
  tasks?: Task[],
  unit = "hours",
  config?: Partial<EventLogConfig>,
): EventLogItem[] {
  const caseCount = config?.caseCount ?? 20;
  const variancePct = config?.timeVariancePercent ?? 15;
  const unitMs = getUnitMultiplierMs(unit);

  const startBase = config?.startDate
    ? new Date(config.startDate).getTime()
    : Date.now() - caseCount * 2 * 3600 * 1000;

  const events: EventLogItem[] = [];

  for (let c = 1; c <= caseCount; c++) {
    const padded = String(c).padStart(3, "0");
    const caseId = `Case_${padded}`;
    const caseStartTime = startBase + (c - 1) * (1.5 * unitMs);

    const ctx: TraverseContext = {
      caseId,
      tasks,
      unitMs,
      variancePct,
      events,
      eventSeq: 0,
    };

    traverseBlocks(blocks, caseStartTime, ctx);
  }

  // Sort strictly by start timestamp
  return events.sort(
    (a, b) => new Date(a.startTimestamp).getTime() - new Date(b.startTimestamp).getTime(),
  );
}

export function computeEventLogSummary(events: EventLogItem[]): EventLogSummary {
  if (events.length === 0) {
    return {
      totalEvents: 0,
      totalCases: 0,
      distinctActivities: 0,
      distinctResources: 0,
      avgCaseDuration: 0,
      avgCaseCost: 0,
    };
  }

  const cases = new Set<string>();
  const activities = new Set<string>();
  const resources = new Set<string>();
  const caseDurations: Record<string, number> = {};
  const caseCosts: Record<string, number> = {};

  for (const e of events) {
    cases.add(e.caseId);
    activities.add(e.activity);
    resources.add(e.resource);

    caseDurations[e.caseId] = (caseDurations[e.caseId] || 0) + e.duration;
    caseCosts[e.caseId] = (caseCosts[e.caseId] || 0) + e.cost;
  }

  const caseIds = Array.from(cases);
  const totalCases = caseIds.length;
  const avgCaseDuration =
    totalCases > 0
      ? caseIds.reduce((sum, id) => sum + (caseDurations[id] || 0), 0) / totalCases
      : 0;
  const avgCaseCost =
    totalCases > 0 ? caseIds.reduce((sum, id) => sum + (caseCosts[id] || 0), 0) / totalCases : 0;

  return {
    totalEvents: events.length,
    totalCases,
    distinctActivities: activities.size,
    distinctResources: resources.size,
    avgCaseDuration: Math.round(avgCaseDuration * 100) / 100,
    avgCaseCost: Math.round(avgCaseCost * 100) / 100,
  };
}

export function exportEventLogToCsv(events: EventLogItem[]): string {
  const headers = [
    "Case ID",
    "Activity",
    "Resource",
    "Start Timestamp",
    "Complete Timestamp",
    "Duration",
    "Cost",
  ];

  const rows = events.map((e) => [
    `"${e.caseId}"`,
    `"${e.activity.replace(/"/g, '""')}"`,
    `"${e.resource.replace(/"/g, '""')}"`,
    `"${e.startTimestamp}"`,
    `"${e.completeTimestamp}"`,
    e.duration,
    e.cost,
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

export function exportEventLogToXes(events: EventLogItem[], processName = "Process Log"): string {
  const groupedByCase = new Map<string, EventLogItem[]>();
  for (const e of events) {
    const list = groupedByCase.get(e.caseId) || [];
    list.push(e);
    groupedByCase.set(e.caseId, list);
  }

  const tracesXml = Array.from(groupedByCase.entries())
    .map(([caseId, items]) => {
      const eventsXml = items
        .map(
          (item) => `      <event>
        <string key="concept:name" value="${escapeXml(item.activity)}" />
        <string key="org:resource" value="${escapeXml(item.resource)}" />
        <string key="lifecycle:transition" value="complete" />
        <date key="time:timestamp" value="${item.completeTimestamp}" />
        <float key="duration" value="${item.duration}" />
        <float key="cost" value="${item.cost}" />
      </event>`,
        )
        .join("\n");

      return `    <trace>
      <string key="concept:name" value="${escapeXml(caseId)}" />
${eventsXml}
    </trace>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8" ?>
<log xes.version="1.0" xes.features="nested-attributes" xmlns="http://www.xes-standard.org/">
  <extension name="Concept" prefix="concept" uri="http://www.xes-standard.org/concept.xesext" />
  <extension name="Lifecycle" prefix="lifecycle" uri="http://www.xes-standard.org/lifecycle.xesext" />
  <extension name="Time" prefix="time" uri="http://www.xes-standard.org/time.xesext" />
  <extension name="Organizational" prefix="org" uri="http://www.xes-standard.org/org.xesext" />
  <string key="concept:name" value="${escapeXml(processName)}" />
${tracesXml}
</log>`;
}

function escapeXml(s: string): string {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
