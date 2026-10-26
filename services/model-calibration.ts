/**
 * Calibrates a Block model from an event log (pure: returns new blocks / tasks):
 * - task times      = median (or mean) processing time of the same-named activity, in the project unit;
 * - XOR branch p    = observed choice frequency at the decision point;
 * - LOOP loopP      = 100 · repeats / (entries + repeats) = 100 · (1 − entries / body starts).
 * See docs/FORMULAS.md §Calibration.
 */
import {
  BlockMode,
  BlockType,
  type Block,
  type Branch,
  type EventLogItem,
  type Task,
} from "@/types";
import { t } from "@/utils/i18n";
import { END_NAME, START_NAME, TraceAutomaton } from "./calibration/trace-automaton";
import { analyzePerformance, orderedCaseTraces } from "./performance-analysis";

export interface CalibrationChange {
  kind: "taskTime" | "branchProbability" | "loopProbability";
  target: string;
  before: number | null;
  after: number;
}

export interface CalibrationResult {
  blocks: Block[];
  tasks: Task[];
  changes: CalibrationChange[];
  warnings: string[];
}

export interface CalibrationOptions {
  timeStat?: "median" | "mean";
  /** Project unit: minutes | hours | days (default hours). */
  unit?: string;
}

const HOURS_TO_UNIT: Record<string, number> = { minutes: 60, hours: 1, days: 1 / 24 };

const round = (value: number, digits: number): number => {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
};

/** Converts counts to percentages rounded to 1 decimal that sum to exactly 100. */
export function countsToPercent(counts: number[]): number[] {
  const total = counts.reduce((s, c) => s + c, 0);
  if (total <= 0) return counts.map(() => 0);
  const pcts = counts.map((c) => round((100 * c) / total, 1));
  const drift = round(100 - pcts.reduce((s, p) => s + p, 0), 1);
  if (drift !== 0) {
    const largest = pcts.indexOf(Math.max(...pcts));
    pcts[largest] = round(pcts[largest]! + drift, 1);
  }
  return pcts;
}

interface ReplayCounts {
  xor: Map<string, number[]>;
  loopEntries: Map<string, number>;
  loopRepeats: Map<string, number>;
}

/** Replays every trace on the model automaton and tallies decisions and loop iterations. */
function replayTraces(automaton: TraceAutomaton, events: EventLogItem[]): ReplayCounts {
  const counts: ReplayCounts = { xor: new Map(), loopEntries: new Map(), loopRepeats: new Map() };
  const bump = (map: Map<string, number>, key: string): void => {
    map.set(key, (map.get(key) ?? 0) + 1);
  };

  for (const trace of orderedCaseTraces(events)) {
    const names = [START_NAME, ...trace.map((e) => e.activity), END_NAME];
    for (let i = 0; i + 1 < names.length; i++) {
      const hits = automaton.replayStep(names[i]!, names[i + 1]!);
      for (const hit of hits ?? []) {
        const node = automaton.nodes[hit.node]!;
        if (node.kind === "xor" && hit.tag !== null) {
          const arr = counts.xor.get(node.blockId) ?? [];
          arr[hit.tag] = (arr[hit.tag] ?? 0) + 1;
          counts.xor.set(node.blockId, arr);
        } else if (node.kind === "loopEntry") bump(counts.loopEntries, node.blockId);
        else if (node.kind === "loopRedo") bump(counts.loopRepeats, node.blockId);
      }
    }
  }
  return counts;
}

export function calibrateModelFromLog(
  blocks: Block[],
  tasks: Task[],
  events: EventLogItem[],
  options: CalibrationOptions = {},
): CalibrationResult {
  const timeStat = options.timeStat ?? "median";
  const factor = HOURS_TO_UNIT[options.unit ?? "hours"] ?? 1;
  const outBlocks = structuredClone(blocks);
  const outTasks = structuredClone(tasks);
  const changes: CalibrationChange[] = [];
  const warnings: string[] = [];

  // 1. Task times from processing-time statistics.
  const perf = analyzePerformance(events);
  const statByName = new Map(
    perf.activities.map((a) => [a.activity.trim().toLowerCase(), a.processing[timeStat]]),
  );
  const newTime = new Map<string, number>(); // taskId -> calibrated time
  for (const task of outTasks) {
    const hours = statByName.get(task.name.trim().toLowerCase());
    if (hours === undefined) {
      warnings.push(t("diagram", "calibration.activityNotInLog", { name: task.name }));
      continue;
    }
    const after = round(hours * factor, 4);
    changes.push({ kind: "taskTime", target: task.name, before: task.time ?? null, after });
    task.time = after;
    newTime.set(task.id, after);
  }

  // 2. Branch / loop probabilities from replaying the traces on the model.
  const automaton = new TraceAutomaton(outBlocks, outTasks);
  if (automaton.hasParallel) warnings.push(t("diagram", "calibration.parallelApproximated"));
  const counts = replayTraces(automaton, events);

  const applyTime = (
    holder: { taskId?: string | null; time?: number; t?: number; loopTime?: number },
    field: "time" | "t" | "loopTime",
  ): void => {
    const time = holder.taskId ? newTime.get(holder.taskId) : undefined;
    if (time !== undefined) holder[field] = time;
  };

  const visitBranch = (br: Branch): void => {
    if (br.mode === BlockMode.COMPOSITE && br.subBlocks?.length) br.subBlocks.forEach(visitBlock);
    else applyTime(br, "t");
  };

  const visitBlock = (b: Block): void => {
    b.subBlocks?.forEach(visitBlock);
    b.branches?.forEach(visitBranch);
    if (b.type === BlockType.SEQ && b.mode !== BlockMode.COMPOSITE) applyTime(b, "time");

    if (b.type === BlockType.XOR && b.branches?.length) {
      const observed = counts.xor.get(b.id);
      const tally = b.branches.map((_, k) => observed?.[k] ?? 0);
      if (!tally.some((c) => c > 0)) {
        warnings.push(t("diagram", "calibration.decisionNotReached", { name: b.label }));
        return;
      }
      countsToPercent(tally).forEach((p, k) => {
        const br = b.branches![k]!;
        changes.push({
          kind: "branchProbability",
          target: `${b.label} → ${br.label}`,
          before: br.p ?? null,
          after: p,
        });
        br.p = p;
      });
    }

    if (b.type === BlockType.LOOP) {
      if (b.mode !== BlockMode.COMPOSITE) applyTime(b, "loopTime");
      const entries = counts.loopEntries.get(b.id) ?? 0;
      const repeats = counts.loopRepeats.get(b.id) ?? 0;
      if (entries === 0) {
        warnings.push(t("diagram", "calibration.loopNotReached", { name: b.label }));
        return;
      }
      const after = round((100 * repeats) / (entries + repeats), 1);
      changes.push({ kind: "loopProbability", target: b.label, before: b.loopP ?? null, after });
      b.loopP = after;
    }
  };
  outBlocks.forEach(visitBlock);

  return { blocks: outBlocks, tasks: outTasks, changes, warnings };
}
