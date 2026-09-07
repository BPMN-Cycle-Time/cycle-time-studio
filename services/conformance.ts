// Conformance Checking Service: Validates Event Log traces against BPMN / Block process model.

import {
  BlockType,
  BlockMode,
  type Block,
  type Branch,
  type Task,
  type EventLogItem,
  type ConformanceViolation,
  type CaseConformanceResult,
  type CaseStepDetail,
  type LogConformanceAnalysis,
  type TraceVariantInfo,
} from "@/types";

let violationCounter = 0;
function uniqueViolationId(): string {
  violationCounter += 1;
  return `viol_${violationCounter}_${Math.random().toString(36).slice(2, 7)}`;
}

interface ModelInspection {
  activities: string[];
  mandatoryActivities: Set<string>;
  resourceMap: Map<string, string>; // activityName -> assigned resource
  precedenceGraph: Map<string, Set<string>>; // activity -> set of activities that MUST precede it
  validPaths: string[][];
}

/**
 * Traverses blocks and tasks to extract activities, valid execution paths, and ordering constraints.
 */
function inspectModel(blocks: Block[], tasks?: Task[]): ModelInspection {
  const activities: string[] = [];
  const mandatoryActivities = new Set<string>();
  const resourceMap = new Map<string, string>();
  const precedenceGraph = new Map<string, Set<string>>();

  const taskMap = new Map<string, Task>();
  if (tasks) {
    for (const t of tasks) taskMap.set(t.id, t);
  }

  const getActivityName = (b: Block): string => {
    if (b.taskId && taskMap.has(b.taskId)) {
      return taskMap.get(b.taskId)!.name;
    }
    return b.label || b.id;
  };

  const getAssignedResource = (b: Block): string | undefined => {
    if (b.resource?.trim()) return b.resource.trim();
    if (b.taskId && taskMap.has(b.taskId)) {
      const r = taskMap.get(b.taskId)!.resource;
      if (r?.trim()) return r.trim();
    }
    return undefined;
  };

  function getBranchName(br: Branch): string {
    if (br.taskId && taskMap.has(br.taskId)) {
      return taskMap.get(br.taskId)!.name;
    }
    return br.label || br.id;
  }

  function getBranchResource(br: Branch): string | undefined {
    if (br.resource?.trim()) return br.resource.trim();
    if (br.taskId && taskMap.has(br.taskId)) {
      const r = taskMap.get(br.taskId)!.resource;
      if (r?.trim()) return r.trim();
    }
    return undefined;
  }

  function getPathsForBranch(br: Branch): string[][] {
    if (br.mode === BlockMode.COMPOSITE && br.subBlocks && br.subBlocks.length > 0) {
      return getPathsForBlocks(br.subBlocks);
    }
    const name = getBranchName(br);
    activities.push(name);
    mandatoryActivities.add(name);
    const res = getBranchResource(br);
    if (res) resourceMap.set(name, res);
    return [[name]];
  }

  // Generate valid path sequences through blocks
  function getPathsForBlocks(blockList: Block[]): string[][] {
    let currentPaths: string[][] = [[]];

    for (const b of blockList) {
      if (b.type === BlockType.SEQ) {
        if (b.mode === BlockMode.COMPOSITE && b.subBlocks && b.subBlocks.length > 0) {
          const subPaths = getPathsForBlocks(b.subBlocks);
          const combined: string[][] = [];
          for (const cp of currentPaths) {
            for (const sp of subPaths) {
              combined.push([...cp, ...sp]);
            }
          }
          currentPaths = combined.length > 0 ? combined : currentPaths;
        } else {
          const name = getActivityName(b);
          activities.push(name);
          mandatoryActivities.add(name);
          const res = getAssignedResource(b);
          if (res) resourceMap.set(name, res);
          currentPaths = currentPaths.map((p) => [...p, name]);
        }
      } else if (b.type === BlockType.XOR && b.branches && b.branches.length > 0) {
        const branchOptions: string[][] = [];
        for (const br of b.branches) {
          branchOptions.push(...getPathsForBranch(br));
        }
        const combined: string[][] = [];
        for (const cp of currentPaths) {
          for (const bo of branchOptions) {
            combined.push([...cp, ...bo]);
          }
        }
        currentPaths = combined.length > 0 ? combined : currentPaths;
      } else if (b.type === BlockType.AND && b.branches && b.branches.length > 0) {
        const branchSeq: string[] = [];
        for (const br of b.branches) {
          const bp = getPathsForBranch(br);
          if (bp[0]) branchSeq.push(...bp[0]);
        }
        currentPaths = currentPaths.map((p) => [...p, ...branchSeq]);
      } else if (b.type === BlockType.LOOP) {
        let loopPaths: string[][] = [];
        if (b.subBlocks && b.subBlocks.length > 0) {
          loopPaths = getPathsForBlocks(b.subBlocks);
        } else if (b.branches && b.branches[0]) {
          loopPaths = getPathsForBranch(b.branches[0]);
        } else {
          const name = getActivityName(b);
          activities.push(name);
          mandatoryActivities.add(name);
          const res = getAssignedResource(b);
          if (res) resourceMap.set(name, res);
          loopPaths = [[name]];
        }
        const combined: string[][] = [];
        for (const cp of currentPaths) {
          for (const lp of loopPaths) {
            combined.push([...cp, ...lp]);
          }
        }
        currentPaths = combined.length > 0 ? combined : currentPaths;
      } else {
        const name = getActivityName(b);
        activities.push(name);
        mandatoryActivities.add(name);
        const res = getAssignedResource(b);
        if (res) resourceMap.set(name, res);
        currentPaths = currentPaths.map((p) => [...p, name]);
      }
    }

    return currentPaths;
  }

  const validPaths = getPathsForBlocks(blocks);

  // Derive precedence constraints: if in all valid paths containing both A and B, A always precedes B
  const distinctActs = Array.from(new Set(activities));
  for (const a of distinctActs) {
    precedenceGraph.set(a, new Set());
  }

  for (const path of validPaths) {
    for (let i = 0; i < path.length; i++) {
      const target = path[i]!;
      const predecessors = precedenceGraph.get(target);
      if (predecessors) {
        for (let j = 0; j < i; j++) {
          predecessors.add(path[j]!);
        }
      }
    }
  }

  return {
    activities: distinctActs,
    mandatoryActivities,
    resourceMap,
    precedenceGraph,
    validPaths: validPaths.length > 0 ? validPaths : [distinctActs],
  };
}

/**
 * Finds the closest normative model path to the executed trace.
 */
function findClosestPath(executed: string[], validPaths: string[][]): string[] {
  if (validPaths.length === 0) return [];
  if (validPaths.length === 1) return validPaths[0]!;

  let bestPath = validPaths[0]!;
  let maxOverlap = -1;

  const execSet = new Set(executed);

  for (const path of validPaths) {
    let overlap = 0;
    for (const act of path) {
      if (execSet.has(act)) overlap++;
    }
    if (overlap > maxOverlap) {
      maxOverlap = overlap;
      bestPath = path;
    }
  }

  return bestPath;
}

/**
 * Analyzes event log conformance against the given BPMN process model.
 */
export function analyzeConformance(
  events: EventLogItem[],
  blocks: Block[],
  tasks?: Task[],
): LogConformanceAnalysis {
  if (!events.length || !blocks.length) {
    return {
      totalCases: 0,
      conformantCases: 0,
      nonConformantCases: 0,
      overallFitnessScore: 100,
      violationCounts: {
        skipped_activity: 0,
        out_of_order: 0,
        unexpected_activity: 0,
        wrong_resource: 0,
      },
      caseResults: [],
      variants: [],
    };
  }

  const model = inspectModel(blocks, tasks);
  const modelActivitySet = new Set(model.activities);

  // Group events by case
  const caseMap = new Map<string, EventLogItem[]>();
  for (const e of events) {
    const list = caseMap.get(e.caseId) || [];
    list.push(e);
    caseMap.set(e.caseId, list);
  }

  const caseResults: CaseConformanceResult[] = [];
  const violationCounts = {
    skipped_activity: 0,
    out_of_order: 0,
    unexpected_activity: 0,
    wrong_resource: 0,
  };

  const variantPatternMap = new Map<
    string,
    { count: number; cases: string[]; isConformant: boolean }
  >();

  for (const [caseId, caseEvents] of caseMap.entries()) {
    // Sort chronologically
    caseEvents.sort(
      (a, b) => new Date(a.startTimestamp).getTime() - new Date(b.startTimestamp).getTime(),
    );

    const executedActivities = caseEvents.map((e) => e.activity);
    const closestExpectedPath = findClosestPath(executedActivities, model.validPaths);
    const violations: ConformanceViolation[] = [];
    const steps: CaseStepDetail[] = [];

    const executedSet = new Set(executedActivities);

    // 1. Check for Unexpected Activities (Bước lạ ngoài quy trình)
    caseEvents.forEach((ev, idx) => {
      let stepStatus: CaseStepDetail["status"] = "conformant";
      let violationMsg: string | undefined;

      if (!modelActivitySet.has(ev.activity)) {
        stepStatus = "unexpected";
        violationMsg = `"${ev.activity}" is not part of the designed process model.`;
        violations.push({
          id: uniqueViolationId(),
          caseId,
          type: "unexpected_activity",
          activity: ev.activity,
          actual: ev.activity,
          stepIndex: idx + 1,
          message: violationMsg,
        });
        violationCounts.unexpected_activity++;
      } else {
        // 2. Check for Resource compliance (Sai người thực hiện)
        const expectedResource = model.resourceMap.get(ev.activity);
        if (
          expectedResource &&
          ev.resource &&
          ev.resource !== "Unassigned" &&
          expectedResource.toLowerCase() !== ev.resource.toLowerCase()
        ) {
          stepStatus = "wrong_resource";
          violationMsg = `Executed by "${ev.resource}" instead of assigned role "${expectedResource}".`;
          violations.push({
            id: uniqueViolationId(),
            caseId,
            type: "wrong_resource",
            activity: ev.activity,
            expected: expectedResource,
            actual: ev.resource,
            resource: ev.resource,
            stepIndex: idx + 1,
            message: violationMsg,
          });
          violationCounts.wrong_resource++;
        }
      }

      steps.push({
        activity: ev.activity,
        resource: ev.resource,
        timestamp: ev.completeTimestamp,
        duration: ev.duration,
        cost: ev.cost,
        status: stepStatus,
        violationMessage: violationMsg,
      });
    });

    // 3. Check for Skipped Activities (Bỏ bước bắt buộc)
    for (const expectedAct of closestExpectedPath) {
      if (!executedSet.has(expectedAct)) {
        const violationMsg = `Mandatory step "${expectedAct}" was skipped.`;
        violations.push({
          id: uniqueViolationId(),
          caseId,
          type: "skipped_activity",
          activity: expectedAct,
          expected: expectedAct,
          actual: "None (Skipped)",
          message: violationMsg,
        });
        violationCounts.skipped_activity++;

        // Add dummy step record to display in step timeline
        steps.push({
          activity: expectedAct,
          resource: model.resourceMap.get(expectedAct) || "Unassigned",
          timestamp: "—",
          duration: 0,
          cost: 0,
          status: "skipped",
          violationMessage: violationMsg,
        });
      }
    }

    // 4. Check for Out-of-Order Execution (Sai thứ tự)
    const seenActivities = new Set<string>();
    for (let i = 0; i < executedActivities.length; i++) {
      const act = executedActivities[i]!;
      const mustPrecede = model.precedenceGraph.get(act);

      if (mustPrecede) {
        for (const req of mustPrecede) {
          // If required step was executed later in this trace instead of earlier
          if (executedSet.has(req) && !seenActivities.has(req)) {
            const violationMsg = `Executed before predecessor "${req}" completed.`;
            violations.push({
              id: uniqueViolationId(),
              caseId,
              type: "out_of_order",
              activity: act,
              expected: `After ${req}`,
              actual: `Before ${req}`,
              stepIndex: i + 1,
              message: violationMsg,
            });
            violationCounts.out_of_order++;

            if (steps[i] && steps[i]!.status === "conformant") {
              steps[i]!.status = "out_of_order";
              steps[i]!.violationMessage = violationMsg;
            }
            break;
          }
        }
      }
      seenActivities.add(act);
    }

    // Compute Case Fitness Score
    const totalBenchmarkSteps = Math.max(closestExpectedPath.length, executedActivities.length, 1);
    const fitnessPenalty = Math.min(1, violations.length / totalBenchmarkSteps);
    const fitnessScore = Math.round(Math.max(0, 1 - fitnessPenalty) * 100);
    const isConformant = violations.length === 0;

    const totalDuration = Math.round(caseEvents.reduce((s, e) => s + e.duration, 0) * 100) / 100;
    const totalCost = Math.round(caseEvents.reduce((s, e) => s + e.cost, 0) * 100) / 100;

    caseResults.push({
      caseId,
      isConformant,
      fitnessScore,
      expectedActivities: closestExpectedPath,
      executedActivities,
      violations,
      steps,
      totalDuration,
      totalCost,
    });

    // Group variants
    const patternKey = executedActivities.join(" ➔ ");
    const existing = variantPatternMap.get(patternKey) || {
      count: 0,
      cases: [],
      isConformant,
    };
    existing.count += 1;
    existing.cases.push(caseId);
    variantPatternMap.set(patternKey, existing);
  }

  const totalCases = caseResults.length;
  const conformantCases = caseResults.filter((c) => c.isConformant).length;
  const nonConformantCases = totalCases - conformantCases;
  const overallFitnessScore =
    totalCases > 0
      ? Math.round((caseResults.reduce((sum, c) => sum + c.fitnessScore, 0) / totalCases) * 10) / 10
      : 100;

  const variants: TraceVariantInfo[] = Array.from(variantPatternMap.entries())
    .map(([key, info], idx) => ({
      variantId: `Var_${idx + 1}`,
      pattern: key ? key.split(" ➔ ") : [],
      count: info.count,
      frequencyPercent: Math.round((info.count / totalCases) * 1000) / 10,
      isConformant: info.isConformant,
      cases: info.cases,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    totalCases,
    conformantCases,
    nonConformantCases,
    overallFitnessScore,
    violationCounts,
    caseResults,
    variants,
  };
}
