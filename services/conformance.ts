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
  resourceMap: Map<string, string>; // activityName -> assigned resource
  precedenceGraph: Map<string, Set<string>>; // activity -> set of activities that MUST precede it
  xorAlternatives: Map<string, Set<string>>; // activity -> set of activities in sibling XOR branches
}

interface BlockAnalysis {
  all: Set<string>;
  first: Set<string>;
  last: Set<string>;
  precedence: Map<string, Set<string>>;
  resources: Map<string, string>;
  xorAlternatives: Map<string, Set<string>>;
}

function emptyAnalysis(): BlockAnalysis {
  return {
    all: new Set(),
    first: new Set(),
    last: new Set(),
    precedence: new Map(),
    resources: new Map(),
    xorAlternatives: new Map(),
  };
}

function mergePrecedence(target: Map<string, Set<string>>, source: Map<string, Set<string>>): void {
  for (const [key, values] of source.entries()) {
    const set = target.get(key) || new Set();
    for (const v of values) set.add(v);
    target.set(key, set);
  }
}

function mergeResources(target: Map<string, string>, source: Map<string, string>): void {
  for (const [key, value] of source.entries()) {
    target.set(key, value);
  }
}

function mergeXorAlternatives(
  target: Map<string, Set<string>>,
  source: Map<string, Set<string>>,
): void {
  for (const [key, values] of source.entries()) {
    const set = target.get(key) || new Set();
    for (const v of values) set.add(v);
    target.set(key, set);
  }
}

function addPrecedence(
  precedence: Map<string, Set<string>>,
  activity: string,
  predecessor: string,
): void {
  const set = precedence.get(activity) || new Set();
  set.add(predecessor);
  precedence.set(activity, set);
}

/**
 * Traverses blocks and tasks to extract activities, ordering constraints, and XOR alternatives
 * without enumerating valid execution paths (avoids exponential blow-up on XOR branches).
 */
function inspectModel(blocks: Block[], tasks?: Task[]): ModelInspection {
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

  function leafAnalysis(name: string, resource: string | undefined): BlockAnalysis {
    const set = new Set([name]);
    return {
      all: set,
      first: set,
      last: set,
      precedence: new Map(),
      resources: resource ? new Map([[name, resource]]) : new Map(),
      xorAlternatives: new Map(),
    };
  }

  function analyzeBranch(br: Branch): BlockAnalysis {
    if (br.mode === BlockMode.COMPOSITE && br.subBlocks && br.subBlocks.length > 0) {
      return analyzeBlocks(br.subBlocks);
    }
    return leafAnalysis(getBranchName(br), getBranchResource(br));
  }

  function analyzeBlocks(blockList: Block[]): BlockAnalysis {
    const result = emptyAnalysis();

    for (let i = 0; i < blockList.length; i++) {
      const b = blockList[i];
      let child: BlockAnalysis;

      if (b.mode === BlockMode.COMPOSITE && b.subBlocks && b.subBlocks.length > 0) {
        child = analyzeBlocks(b.subBlocks);
      } else if (b.type === BlockType.XOR && b.branches && b.branches.length > 0) {
        child = analyzeXorBranches(b.branches);
      } else if (b.type === BlockType.AND && b.branches && b.branches.length > 0) {
        child = analyzeAndBranches(b.branches);
      } else if (b.type === BlockType.LOOP) {
        child = analyzeLoop(b);
      } else {
        child = leafAnalysis(getActivityName(b), getAssignedResource(b));
      }

      // Merge child data
      for (const act of child.all) result.all.add(act);
      mergePrecedence(result.precedence, child.precedence);
      mergeResources(result.resources, child.resources);
      mergeXorAlternatives(result.xorAlternatives, child.xorAlternatives);

      // Cross-block precedence: every activity seen so far must precede every activity in child
      for (const prev of result.all) {
        if (child.all.has(prev)) continue;
        for (const curr of child.all) {
          addPrecedence(result.precedence, curr, prev);
        }
      }

      if (i === 0) {
        result.first = child.first;
        result.last = child.last;
      } else {
        result.last = child.last;
      }
    }

    return result;
  }

  function analyzeXorBranches(branches: Branch[]): BlockAnalysis {
    const result = emptyAnalysis();
    const branchAnalyses: BlockAnalysis[] = [];

    for (const br of branches) {
      const child = analyzeBranch(br);
      branchAnalyses.push(child);

      for (const act of child.all) result.all.add(act);
      mergePrecedence(result.precedence, child.precedence);
      mergeResources(result.resources, child.resources);
      mergeXorAlternatives(result.xorAlternatives, child.xorAlternatives);

      for (const act of child.first) result.first.add(act);
      for (const act of child.last) result.last.add(act);
    }

    // Record XOR alternatives: activities in different branches are alternatives
    for (let i = 0; i < branchAnalyses.length; i++) {
      for (let j = 0; j < branchAnalyses.length; j++) {
        if (i === j) continue;
        const setA = branchAnalyses[i]!.all;
        const setB = branchAnalyses[j]!.all;
        for (const act of setA) {
          const altSet = result.xorAlternatives.get(act) || new Set();
          for (const alt of setB) altSet.add(alt);
          result.xorAlternatives.set(act, altSet);
        }
      }
    }

    return result;
  }

  function analyzeAndBranches(branches: Branch[]): BlockAnalysis {
    const result = emptyAnalysis();

    for (const br of branches) {
      const child = analyzeBranch(br);

      for (const act of child.all) result.all.add(act);
      mergePrecedence(result.precedence, child.precedence);
      mergeResources(result.resources, child.resources);
      mergeXorAlternatives(result.xorAlternatives, child.xorAlternatives);

      for (const act of child.first) result.first.add(act);
      for (const act of child.last) result.last.add(act);
    }

    return result;
  }

  function analyzeLoop(block: Block): BlockAnalysis {
    // Loop body may repeat, but for conformance checking we treat the body like a sequential block
    // that can be traversed multiple times. Internal precedence is preserved; cross-iteration
    // ordering is intentionally relaxed to keep validation linear.
    if (block.mode === BlockMode.COMPOSITE && block.subBlocks && block.subBlocks.length > 0) {
      return analyzeBlocks(block.subBlocks);
    }
    if (block.branches && block.branches[0]) {
      return analyzeBranch(block.branches[0]);
    }
    return leafAnalysis(getActivityName(block), getAssignedResource(block));
  }

  const analysis = analyzeBlocks(blocks);

  return {
    activities: Array.from(analysis.all),
    resourceMap: analysis.resources,
    precedenceGraph: analysis.precedence,
    xorAlternatives: analysis.xorAlternatives,
  };
}

/**
 * Returns a deterministic topological ordering of activities using the precedence graph.
 */
function topologicalOrder(activities: Set<string>, precedence: Map<string, Set<string>>): string[] {
  const result: string[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(act: string) {
    if (visited.has(act)) return;
    if (visiting.has(act)) return; // cycle guard
    visiting.add(act);

    for (const req of precedence.get(act) || []) {
      if (activities.has(req)) visit(req);
    }

    visiting.delete(act);
    visited.add(act);
    result.push(act);
  }

  const sorted = Array.from(activities).sort();
  for (const act of sorted) visit(act);
  return result;
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
    const violations: ConformanceViolation[] = [];
    const steps: CaseStepDetail[] = [];

    const executedSet = new Set(executedActivities);

    // 1. Check for Unexpected Activities and Wrong Resource (Bước lạ ngoài quy trình / Sai người thực hiện)
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
        // 2. Check for Resource compliance
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
    // An activity is skipped only if it was not executed and no XOR alternative was executed.
    for (const expectedAct of modelActivitySet) {
      if (!executedSet.has(expectedAct)) {
        const alternatives = model.xorAlternatives.get(expectedAct);
        const hasAlternativeExecuted = alternatives
          ? Array.from(alternatives).some((alt) => executedSet.has(alt))
          : false;

        if (!hasAlternativeExecuted) {
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
    }

    // 4. Check for Out-of-Order Execution (Sai thứ tự)
    const seenActivities = new Set<string>();
    for (let i = 0; i < executedActivities.length; i++) {
      const act = executedActivities[i]!;
      const mustPrecede = model.precedenceGraph.get(act);

      if (mustPrecede) {
        let outOfOrder = false;
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
            outOfOrder = true;

            if (steps[i] && steps[i]!.status === "conformant") {
              steps[i]!.status = "out_of_order";
              steps[i]!.violationMessage = violationMsg;
            }
            break;
          }
        }
        if (outOfOrder) continue;
      }
      seenActivities.add(act);
    }

    // Compute Case Fitness Score
    const expectedActivities = topologicalOrder(modelActivitySet, model.precedenceGraph);
    const totalBenchmarkSteps = Math.max(expectedActivities.length, executedActivities.length, 1);
    const fitnessPenalty = Math.min(1, violations.length / totalBenchmarkSteps);
    const fitnessScore = Math.round(Math.max(0, 1 - fitnessPenalty) * 100);
    const isConformant = violations.length === 0;

    const totalDuration = Math.round(caseEvents.reduce((s, e) => s + e.duration, 0) * 100) / 100;
    const totalCost = Math.round(caseEvents.reduce((s, e) => s + e.cost, 0) * 100) / 100;

    caseResults.push({
      caseId,
      isConformant,
      fitnessScore,
      expectedActivities,
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
