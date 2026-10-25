// Conformance Checking Service: Validates Event Log traces against BPMN / Block process model.

import {
  type Block,
  type Task,
  type EventLogItem,
  type ConformanceViolation,
  type CaseConformanceResult,
  type CaseStepDetail,
  type LogConformanceAnalysis,
  type TraceVariantInfo,
} from "@/types";
import { inspectModel } from "./conformance-model";

let violationCounter = 0;
function uniqueViolationId(): string {
  violationCounter += 1;
  return `viol_${violationCounter}_${Math.random().toString(36).slice(2, 7)}`;
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
        // Compare the assigned role/lane with the event's role when the log has one,
        // never a lane name with a person's name.
        const expectedResource = model.resourceMap.get(ev.activity);
        const actualPerformer = ev.role?.trim() || ev.resource;
        if (
          expectedResource &&
          actualPerformer &&
          actualPerformer !== "Unassigned" &&
          expectedResource.toLowerCase() !== actualPerformer.toLowerCase()
        ) {
          stepStatus = "wrong_resource";
          violationMsg = `Executed by "${actualPerformer}" instead of assigned role "${expectedResource}".`;
          violations.push({
            id: uniqueViolationId(),
            caseId,
            type: "wrong_resource",
            activity: ev.activity,
            expected: expectedResource,
            actual: actualPerformer,
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
    // An activity is skipped only if it is mandatory, was not executed and no XOR alternative was executed.
    for (const expectedAct of modelActivitySet) {
      if (!executedSet.has(expectedAct) && !model.optionalActivities.has(expectedAct)) {
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
