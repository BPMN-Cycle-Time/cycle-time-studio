import type {
  Block,
  Branch,
  Task,
  BprAnalysis,
  BprAsIsMetrics,
  BprIssue,
  BprIssueType,
  BprRecommendation,
  BprSeverity,
  BprImpact,
  BprTechnique,
} from "@/types";
import { BlockType, BlockMode } from "@/types";
import {
  computeBlockCost,
  computeBlockTime,
  computeBranchCost,
  computeBranchTime,
  computeFlow,
} from "./engine";
import { generateEventLog } from "./event-log";
import { analyzeConformance } from "./conformance";
import { computeSlaEvaluation, enrichEventsWithSla } from "./sla-benchmark";
import type { EventLogItem } from "@/types";

interface FlattenedNode {
  id: string;
  label: string;
  type: BlockType;
  time: number;
  cost: number;
  resource?: string;
  loopP?: number;
}

function flattenBlocks(blocks: Block[], tasks?: Task[]): FlattenedNode[] {
  const result: FlattenedNode[] = [];

  function visitBlock(b: Block) {
    const time = computeBlockTime(b, tasks);
    const cost = computeBlockCost(b, tasks).total;
    result.push({
      id: b.id,
      label: b.label,
      type: b.type,
      time,
      cost,
      resource: b.resource,
      loopP: b.loopP,
    });

    if (b.mode === BlockMode.COMPOSITE && b.subBlocks) {
      b.subBlocks.forEach(visitBlock);
    }

    if (b.branches) {
      b.branches.forEach((br) => visitBranch(br));
    }
  }

  function visitBranch(br: Branch) {
    const time = computeBranchTime(br, tasks);
    const cost = computeBranchCost(br, tasks).total;
    result.push({
      id: br.id,
      label: br.label,
      type: BlockType.SEQ,
      time,
      cost,
      resource: br.resource,
    });

    if (br.mode === BlockMode.COMPOSITE && br.subBlocks) {
      br.subBlocks.forEach(visitBlock);
    }
  }

  blocks.forEach(visitBlock);
  return result;
}

function countGateways(blocks: Block[]): { xor: number; and: number; loop: number } {
  let xor = 0;
  let and = 0;
  let loop = 0;

  function visit(b: Block) {
    if (b.type === BlockType.XOR) xor++;
    if (b.type === BlockType.AND) and++;
    if (b.type === BlockType.LOOP) loop++;

    if (b.mode === BlockMode.COMPOSITE && b.subBlocks) {
      b.subBlocks.forEach(visit);
    }
    if (b.branches) {
      b.branches.forEach((br) => {
        if (br.mode === BlockMode.COMPOSITE && br.subBlocks) {
          br.subBlocks.forEach(visit);
        }
      });
    }
  }

  blocks.forEach(visit);
  return { xor, and, loop };
}

function computeTaskCount(blocks: Block[]): number {
  let count = 0;

  function visit(b: Block) {
    if (b.taskId || (b.label && b.type === BlockType.SEQ)) count++;

    if (b.mode === BlockMode.COMPOSITE && b.subBlocks) {
      b.subBlocks.forEach(visit);
    }
    if (b.branches) {
      b.branches.forEach((br) => {
        if (br.taskId || br.label) count++;
        if (br.mode === BlockMode.COMPOSITE && br.subBlocks) {
          br.subBlocks.forEach(visit);
        }
      });
    }
  }

  blocks.forEach(visit);
  return count;
}

function detectReworkLoopIssues(blocks: Block[], tasks?: Task[]): BprIssue[] {
  const issues: BprIssue[] = [];

  function visit(b: Block, path: string[]) {
    if (b.type === BlockType.LOOP) {
      const loopP = b.loopP ?? 0;
      const severity: BprSeverity = loopP >= 50 ? "critical" : loopP >= 25 ? "high" : "medium";
      issues.push({
        id: `loop-${b.id}`,
        type: "reworkLoop",
        severity,
        title: `Rework loop "${b.label}"`,
        description: `This loop repeats with ${loopP}% probability, inflating cycle time and cost.`,
        evidence: `Loop probability: ${loopP}%; expected iteration cost: ${computeBlockCost(b, tasks).total.toFixed(2)}`,
        affectedTaskIds: [b.id],
        affectedTaskNames: [b.label],
      });
    }

    if (b.mode === BlockMode.COMPOSITE && b.subBlocks) {
      b.subBlocks.forEach((child) => visit(child, [...path, b.id]));
    }
    if (b.branches) {
      b.branches.forEach((br) => {
        if (br.mode === BlockMode.COMPOSITE && br.subBlocks) {
          br.subBlocks.forEach((child) => visit(child, [...path, b.id]));
        }
      });
    }
  }

  blocks.forEach((b) => visit(b, []));
  return issues;
}

function detectBottleneckIssues(nodes: FlattenedNode[], totalTime: number): BprIssue[] {
  if (nodes.length === 0 || totalTime === 0) return [];

  const sorted = [...nodes].sort((a, b) => b.time - a.time);
  const top = sorted.slice(0, Math.min(3, sorted.length));
  const threshold = totalTime * 0.15;

  return top
    .filter((n) => n.time >= threshold)
    .map((n) => {
      const share = totalTime > 0 ? (n.time / totalTime) * 100 : 0;
      return {
        id: `bottleneck-${n.id}`,
        type: "bottleneck" as BprIssueType,
        severity: share >= 40 ? "critical" : share >= 25 ? "high" : "medium",
        title: `Bottleneck: ${n.label}`,
        description: `This step consumes a large share of total cycle time.`,
        evidence: `Expected time: ${n.time.toFixed(2)} (${share.toFixed(1)}% of total)`,
        affectedTaskIds: [n.id],
        affectedTaskNames: [n.label],
      };
    });
}

function detectHighCostIssues(nodes: FlattenedNode[], totalCost: number): BprIssue[] {
  if (nodes.length === 0 || totalCost === 0) return [];

  const sorted = [...nodes].sort((a, b) => b.cost - a.cost);
  const top = sorted.slice(0, Math.min(3, sorted.length));
  const threshold = totalCost * 0.15;

  return top
    .filter((n) => n.cost >= threshold)
    .map((n) => {
      const share = totalCost > 0 ? (n.cost / totalCost) * 100 : 0;
      return {
        id: `cost-${n.id}`,
        type: "highCost" as BprIssueType,
        severity: share >= 40 ? "critical" : share >= 25 ? "high" : "medium",
        title: `High cost: ${n.label}`,
        description: `This step represents a significant portion of total process cost.`,
        evidence: `Expected cost: ${n.cost.toFixed(2)} (${share.toFixed(1)}% of total)`,
        affectedTaskIds: [n.id],
        affectedTaskNames: [n.label],
      };
    });
}

function detectSlaIssues(events: EventLogItem[], blocks: Block[], tasks?: Task[]): BprIssue[] {
  if (events.length === 0 || blocks.length === 0) return [];

  const enriched = enrichEventsWithSla(events, undefined, tasks, blocks);
  const evaluation = computeSlaEvaluation(enriched);

  if (evaluation.overallComplianceRate >= 95) return [];

  return evaluation.topDelayedTasks.slice(0, 3).map((task, idx) => ({
    id: `sla-${idx}-${task.taskId || task.taskName}`,
    type: "slaBreach",
    severity: task.delayedRate > 0.5 ? "high" : "medium",
    title: `SLA breaches: ${task.taskName}`,
    description: `This task frequently exceeds its benchmark duration.`,
    evidence: `${task.delayedCount} delayed (${(task.delayedRate * 100).toFixed(1)}%); overall SLA compliance: ${evaluation.overallComplianceRate.toFixed(1)}%`,
    affectedTaskIds: [task.taskId || task.taskName],
    affectedTaskNames: [task.taskName],
  }));
}

function detectConformanceIssues(
  events: EventLogItem[],
  blocks: Block[],
  tasks?: Task[],
): BprIssue[] {
  if (events.length === 0 || blocks.length === 0) return [];

  const analysis = analyzeConformance(events, blocks, tasks);
  const fitness = analysis.overallFitnessScore;

  if (fitness >= 95) return [];

  const issueTypes: BprIssue[] = [];

  if (analysis.violationCounts.skipped_activity > 0) {
    issueTypes.push({
      id: "conformance-skipped",
      type: "lowConformanceFitness",
      severity: "high",
      title: "Skipped activities detected",
      description: "Some cases skip mandatory activities, hurting quality and compliance.",
      evidence: `${analysis.violationCounts.skipped_activity} skipped activity violation(s); fitness: ${fitness.toFixed(1)}%`,
      affectedTaskIds: [],
      affectedTaskNames: [],
    });
  }

  if (analysis.violationCounts.wrong_resource > 0) {
    issueTypes.push({
      id: "conformance-resource",
      type: "conformanceViolation",
      severity: "high",
      title: "Resource assignment violations",
      description: "Activities are executed by unauthorized resources.",
      evidence: `${analysis.violationCounts.wrong_resource} wrong resource violation(s)`,
      affectedTaskIds: [],
      affectedTaskNames: [],
    });
  }

  if (analysis.violationCounts.out_of_order > 0) {
    issueTypes.push({
      id: "conformance-order",
      type: "conformanceViolation",
      severity: "medium",
      title: "Out-of-order execution",
      description: "Some cases execute activities in an unexpected sequence.",
      evidence: `${analysis.violationCounts.out_of_order} out-of-order violation(s)`,
      affectedTaskIds: [],
      affectedTaskNames: [],
    });
  }

  if (issueTypes.length === 0 && fitness < 95) {
    issueTypes.push({
      id: "conformance-low",
      type: "lowConformanceFitness",
      severity: "medium",
      title: "Low process conformance",
      description: "The event log deviates from the designed process model.",
      evidence: `Overall fitness: ${fitness.toFixed(1)}%`,
      affectedTaskIds: [],
      affectedTaskNames: [],
    });
  }

  return issueTypes;
}

function mapToRecommendations(issues: BprIssue[]): BprRecommendation[] {
  const recommendations: BprRecommendation[] = [];

  const techniqueMap: Record<BprIssueType, BprTechnique[]> = {
    reworkLoop: ["resequencing", "automation"],
    bottleneck: ["parallelization", "resourceOptimization", "automation"],
    highCost: ["elimination", "automation", "resourceOptimization"],
    conformanceViolation: ["automation", "resourceOptimization"],
    slaBreach: ["communicationOptimization", "automation", "resourceOptimization"],
    lowConformanceFitness: ["automation", "specialization"],
    longWaitTime: ["parallelization", "communicationOptimization"],
  };

  const techniqueDescriptions: Record<BprTechnique, string> = {
    elimination: "Remove or merge low-value activities to cut time and cost.",
    resequencing: "Reorder activities to prevent rework and reduce waiting.",
    parallelization: "Execute independent activities concurrently.",
    specialization: "Dedicate specialized roles or standardized sub-processes.",
    resourceOptimization: "Assign the right resources and empower decision-makers.",
    communicationOptimization: "Add notifications, status tracking, and real-time feedback.",
    automation: "Introduce digital gates, RBAC, or automated handoffs.",
  };

  const seen = new Set<string>();

  for (const issue of issues) {
    const techniques = techniqueMap[issue.type] || [];
    for (const technique of techniques) {
      const key = `${technique}-${issue.id}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const impact: BprImpact =
        issue.severity === "critical" ? "high" : issue.severity === "high" ? "high" : "medium";
      const confidence: BprImpact =
        issue.type === "reworkLoop" || issue.type === "slaBreach" ? "high" : "medium";

      recommendations.push({
        id: `rec-${key}`,
        technique,
        title: `${technique.charAt(0).toUpperCase() + technique.slice(1)} for ${issue.affectedTaskNames[0] || "process"}`,
        description: techniqueDescriptions[technique],
        relatedIssueIds: [issue.id],
        impact,
        confidence,
      });
    }
  }

  return recommendations;
}

export function analyzeBpr(
  blocks: Block[],
  tasks?: Task[],
  unit = "hours",
  uploadedEvents?: EventLogItem[] | null,
): BprAnalysis {
  const flow = computeFlow(blocks, tasks);
  const gatewayCounts = countGateways(blocks);
  const taskCount = computeTaskCount(blocks);

  const events =
    uploadedEvents && uploadedEvents.length > 0
      ? uploadedEvents
      : generateEventLog(blocks, tasks, unit, { caseCount: 30 });

  const conformance = analyzeConformance(events, blocks, tasks);
  const enrichedEvents = enrichEventsWithSla(events, undefined, tasks, blocks);
  const slaEvaluation = computeSlaEvaluation(enrichedEvents);

  const metrics: BprAsIsMetrics = {
    totalTime: flow.total,
    totalCost: flow.totalCost,
    laborCost: flow.laborCost,
    fixedCost: flow.fixedCost,
    taskCount,
    xorCount: gatewayCounts.xor,
    andCount: gatewayCounts.and,
    loopCount: gatewayCounts.loop,
    fitness: conformance.overallFitnessScore,
    slaCompliance: slaEvaluation.overallComplianceRate,
  };

  const nodes = flattenBlocks(blocks, tasks);

  const issues: BprIssue[] = [
    ...detectReworkLoopIssues(blocks, tasks),
    ...detectBottleneckIssues(nodes, flow.total),
    ...detectHighCostIssues(nodes, flow.totalCost),
    ...detectSlaIssues(events, blocks, tasks),
    ...detectConformanceIssues(events, blocks, tasks),
  ];

  // Sort by severity
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  const recommendations = mapToRecommendations(issues);

  return { metrics, issues, recommendations };
}
