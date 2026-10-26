/**
 * Acceptance checks for (1) event-log performance / waiting-time analysis and
 * (2) calibrating the process model from an event log. Runs real services headlessly:
 *
 *   npx tsx scripts/verify-performance-calibration.ts
 *
 * Exit code 0 = every REQUIRED check passed. Spec: docs/fixes/PERFORMANCE_CALIBRATION_FIX.md.
 * Reference numbers: docs/fixes/fixtures/performance_reference.json (computed with pandas/numpy).
 *
 * New modules are loaded with a runtime import so this file type-checks before they exist;
 * the expected API contract is declared below and MUST be implemented exactly.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { bpmnXmlToBlocks } from "@/services/bpmn";
import { blocksToSemanticXml } from "@/services/bpmn-builder";
import { parseEventLogCsv } from "@/services/event-log-parser";
import { computeFlow } from "@/services/engine";
import { analyzeBpr } from "@/services/bpr";
import { BlockMode, BlockType, type Block, type EventLogItem, type Task } from "@/types";

// ---------------------------------------------------------------------------
// API contract (must match services/performance-analysis.ts and services/model-calibration.ts)
// ---------------------------------------------------------------------------
interface DurationStats {
  count: number;
  mean: number;
  median: number;
  p90: number;
  p95: number;
  max: number;
  total: number;
}
interface ActivityPerformance {
  activity: string;
  processing: DurationStats;
  waiting: DurationStats | null;
}
interface PerformanceAnalysis {
  activities: ActivityPerformance[];
  resources: { resource: string; processing: DurationStats; waiting: DurationStats | null }[];
  cases: {
    caseId: string;
    cycleTime: number;
    processingTime: number;
    waitingTime: number;
    cte: number;
  }[];
  summary: {
    caseCount: number;
    cycleTime: DurationStats;
    processing: DurationStats;
    waiting: DurationStats;
    cteOverall: number;
  };
  waitingShareRanking: { activity: string; share: number }[];
}
interface WorkCalendar {
  workDays: number[];
  blocks: { start: string; end: string }[];
}
interface PerformanceModule {
  analyzePerformance: (
    events: EventLogItem[],
    options?: { calendar?: WorkCalendar },
  ) => PerformanceAnalysis;
}
interface CalibrationResult {
  blocks: Block[];
  tasks: Task[];
  changes: { kind: string; target: string; before: number | null; after: number }[];
  warnings: string[];
}
interface CalibrationModule {
  calibrateModelFromLog: (
    blocks: Block[],
    tasks: Task[],
    events: EventLogItem[],
    options?: { timeStat?: "median" | "mean"; unit?: string },
  ) => CalibrationResult;
}

// ---------------------------------------------------------------------------
const FIXTURES = path.join(process.cwd(), "docs/fixes/fixtures");
const read = (name: string): string =>
  readFileSync(path.join(FIXTURES, name), "utf8").replace(/^﻿/, "");

interface RefStats {
  count: number;
  mean: number;
  median: number;
  p90: number;
  p95: number;
  max: number;
  total: number;
}
interface RefPerf {
  activities: Record<string, { processing: RefStats; waiting: RefStats | null }>;
  cases: { count?: number; cycleTime: RefStats; cteOverall: number };
  waitingShareRanking?: { activity: string; share: number }[];
}
interface RefLog {
  performance: RefPerf;
  performanceWorkingHours: RefPerf;
  calibration?: {
    gatewayProbabilities: Record<string, Record<string, number>>;
    reworkLoopP: number;
    taskTimeMedianHours: Record<string, number>;
    expectedProcessingPerCaseHours_meanTimes: number;
  };
}
const REF = JSON.parse(read("performance_reference.json")) as Record<string, RefLog>;

type Level = "REQUIRED" | "PHASE-2";
const results: { id: string; level: Level; title: string; pass: boolean; detail: string }[] = [];
async function check(
  id: string,
  level: Level,
  title: string,
  fn: () => Promise<string> | string,
): Promise<void> {
  try {
    results.push({ id, level, title, pass: true, detail: await fn() });
  } catch (err) {
    results.push({ id, level, title, pass: false, detail: (err as Error).message.slice(0, 400) });
  }
}
function assert(cond: boolean, message: string): void {
  if (!cond) throw new Error(message);
}
/** |a-b| <= max(abs, rel*|b|) */
function near(actual: number, expected: number, what: string, rel = 0.001, abs = 0.005): void {
  const tol = Math.max(abs, rel * Math.abs(expected));
  assert(
    Number.isFinite(actual) && Math.abs(actual - expected) <= tol,
    `${what}: got ${actual}, expected ${expected.toFixed(4)} (±${tol.toFixed(4)})`,
  );
}

async function load<T>(modulePath: string): Promise<T> {
  const spec: string = modulePath; // runtime-only import (module may not exist yet)
  return (await import(spec)) as T;
}

const STD = "event_log_chuan";
const SC = "event_log_tinh_huong";
const KEY_ACTIVITIES = [
  "AI Bot Code Review",
  "FE Lead Review",
  "Integrate Real API",
  "Merge Code",
  "Clarify Spec",
];

function comparePerf(perf: PerformanceAnalysis, ref: RefPerf, label: string): string {
  for (const act of KEY_ACTIVITIES) {
    const got = perf.activities.find((a) => a.activity === act);
    const exp = ref.activities[act]!;
    assert(!!got, `${label}: activity "${act}" missing`);
    assert(!!got!.waiting && !!exp.waiting, `${label}: waiting stats missing for ${act}`);
    assert(
      got!.waiting!.count === exp.waiting!.count,
      `${label} ${act} waiting.count ${got!.waiting!.count} ≠ ${exp.waiting!.count}`,
    );
    for (const k of ["median", "p95", "max", "mean"] as const) {
      near(got!.waiting![k], exp.waiting![k], `${label} ${act} waiting.${k}`);
    }
  }
  for (const [act, exp] of Object.entries(ref.activities)) {
    const got = perf.activities.find((a) => a.activity === act);
    assert(!!got, `${label}: activity "${act}" missing`);
    near(got!.processing.median, exp.processing.median, `${label} ${act} processing.median`);
    assert(got!.processing.count === exp.processing.count, `${label} ${act} processing.count`);
  }
  near(perf.summary.cteOverall, ref.cases.cteOverall, `${label} cteOverall`, 0.001, 0.0005);
  near(perf.summary.cycleTime.median, ref.cases.cycleTime.median, `${label} cycleTime.median`);
  return "OK";
}

/** Finds an XOR block by gateway label anywhere in the tree. */
function findXor(blocks: Block[], label: string): Block | undefined {
  for (const b of blocks) {
    if (b.type === BlockType.XOR && b.label === label) return b;
    const inSub = b.subBlocks ? findXor(b.subBlocks, label) : undefined;
    if (inSub) return inSub;
    for (const br of b.branches ?? []) {
      const inBr = br.subBlocks ? findXor(br.subBlocks, label) : undefined;
      if (inBr) return inBr;
    }
  }
  return undefined;
}
function findLoop(blocks: Block[]): Block | undefined {
  for (const b of blocks) {
    if (b.type === BlockType.LOOP) return b;
    const inSub = b.subBlocks ? findLoop(b.subBlocks) : undefined;
    if (inSub) return inSub;
  }
  return undefined;
}
/** Activity names directly or transitively inside a branch. */
function branchActivities(br: NonNullable<Block["branches"]>[number], tasks: Task[]): string[] {
  const names: string[] = [];
  const nameOf = (id?: string | null) => tasks.find((t) => t.id === id)?.name;
  const walk = (list: Block[]): void =>
    list.forEach((b) => {
      const n = nameOf(b.taskId);
      if (n) names.push(n);
      if (b.subBlocks) walk(b.subBlocks);
      b.branches?.forEach((x) => {
        const bn = nameOf(x.taskId);
        if (bn) names.push(bn);
        if (x.subBlocks) walk(x.subBlocks);
      });
    });
  const own = nameOf(br.taskId);
  if (own) names.push(own);
  if (br.subBlocks) walk(br.subBlocks);
  return names;
}

async function main(): Promise<void> {
  const std = parseEventLogCsv(read("event_log_chuan.csv"));
  const sc = parseEventLogCsv(read("event_log_tinh_huong.csv"));
  const imported = await bpmnXmlToBlocks(read("FE_Code_Review.bpmn"), []);

  let perfMod: PerformanceModule | null = null;
  let calMod: CalibrationModule | null = null;

  // ---------------- Performance / waiting time ----------------
  await check(
    "P1",
    "REQUIRED",
    "analyzePerformance() exists and returns per-case results",
    async () => {
      perfMod = await load<PerformanceModule>("@/services/performance-analysis");
      const p = perfMod.analyzePerformance(std);
      assert(
        p.summary.caseCount === 166 && p.cases.length === 166,
        `caseCount ${p.summary.caseCount}`,
      );
      return `${p.activities.length} activities, ${p.resources.length} resources`;
    },
  );

  await check("P2", "REQUIRED", "Waiting / processing stats match reference (standard log)", () => {
    assert(!!perfMod, "needs P1");
    return comparePerf(perfMod!.analyzePerformance(std), REF[STD]!.performance, "std");
  });

  await check("P3", "REQUIRED", "Waiting / processing stats match reference (scenario log)", () => {
    assert(!!perfMod, "needs P1");
    return comparePerf(perfMod!.analyzePerformance(sc), REF[SC]!.performance, "scenario");
  });

  await check("P4", "REQUIRED", "Bottleneck ranking by share of total waiting time", () => {
    assert(!!perfMod, "needs P1");
    for (const [log, ev] of [
      [STD, std],
      [SC, sc],
    ] as const) {
      const got = perfMod!.analyzePerformance(ev).waitingShareRanking.slice(0, 3);
      const exp = REF[log]!.performance.waitingShareRanking!.slice(0, 3);
      got.forEach((g, i) => {
        assert(
          g.activity === exp[i]!.activity,
          `${log} rank ${i + 1}: ${g.activity} ≠ ${exp[i]!.activity}`,
        );
        near(g.share, exp[i]!.share, `${log} share ${g.activity}`, 0.001, 0.0005);
      });
    }
    return `top-1: FE Lead Review (${(REF[STD]!.performance.waitingShareRanking![0]!.share * 100).toFixed(1)}%)`;
  });

  await check(
    "P5",
    "REQUIRED",
    "Injected scenarios are visible (bot overload, Lead absence)",
    () => {
      assert(!!perfMod, "needs P1");
      const bot = (e: EventLogItem[]) =>
        perfMod!.analyzePerformance(e).activities.find((a) => a.activity === "AI Bot Code Review")!
          .waiting!;
      const lead = perfMod!
        .analyzePerformance(sc)
        .activities.find((a) => a.activity === "FE Lead Review")!.waiting!;
      assert(
        bot(sc).p95 >= 5 * bot(std).p95,
        `bot p95 scenario ${bot(sc).p95} vs std ${bot(std).p95}`,
      );
      assert(lead.max > 400, `Lead max wait ${lead.max}h`);
      return `bot wait p95 ${(bot(std).p95 * 60).toFixed(1)} → ${(bot(sc).p95 * 60).toFixed(1)} min; Lead max ${lead.max.toFixed(0)} h`;
    },
  );

  await check("P6", "PHASE-2", "Working-hours calendar (Mon–Fri 08:30–12:00, 13:00–17:30)", () => {
    assert(!!perfMod, "needs P1");
    const calendar: WorkCalendar = {
      workDays: [1, 2, 3, 4, 5],
      blocks: [
        { start: "08:30", end: "12:00" },
        { start: "13:00", end: "17:30" },
      ],
    };
    return comparePerf(
      perfMod!.analyzePerformance(std, { calendar }),
      REF[STD]!.performanceWorkingHours,
      "std/working-hours",
    );
  });

  // ---------------- Calibration ----------------
  let calibrated: CalibrationResult | null = null;
  await check(
    "K1",
    "REQUIRED",
    "calibrateModelFromLog(): gateway probabilities from the log",
    async () => {
      calMod = await load<CalibrationModule>("@/services/model-calibration");
      calibrated = calMod.calibrateModelFromLog(imported.blocks, imported.tasks, std, {
        timeStat: "median",
        unit: "hours",
      });
      const ref = REF[STD]!.calibration!.gatewayProbabilities;
      // gateway → [activity identifying the branch, reference key]; the other branch gets the rest
      const spec: Record<string, [string | null, string][]> = {
        "Spec clear?": [
          ["Ask PM to Clarify Spec", "No"],
          [null, "Yes"],
        ],
        "API ready?": [
          ["Integrate Real API", "No"],
          [null, "Yes"],
        ],
        "Bot passed?": [
          ["Fix Review Comments", "Fix Review Comments"],
          ["FE Lead Review", "Yes"],
        ],
        "Important PR?": [
          ["FE Lead Review", "Yes"],
          [null, "No"],
        ],
        "Code Approved?": [
          ["Fix Review Comments", "Fix Review Comments"],
          [null, "Approved"],
        ],
      };
      const out: string[] = [];
      for (const [gw, branches] of Object.entries(spec)) {
        const xor = findXor(calibrated.blocks, gw);
        assert(!!xor?.branches?.length, `XOR "${gw}" not found`);
        for (const [act, key] of branches) {
          const br = xor!.branches!.find((b) => {
            const acts = branchActivities(b, calibrated!.tasks);
            return act === null ? acts.length === 0 : acts.includes(act);
          });
          assert(!!br, `${gw}: branch for ${act ?? "(empty)"} not found`);
          near(br!.p ?? NaN, ref[gw]![key]!, `${gw} → ${key}`, 0, 1.0);
        }
        out.push(`${gw} ${xor!.branches!.map((b) => (b.p ?? 0).toFixed(1)).join("/")}`);
      }
      return out.join("; ");
    },
  );

  await check(
    "K2",
    "REQUIRED",
    "Rework loop probability = 1 − loop entries / AI Bot reviews",
    () => {
      assert(!!calibrated, "needs K1");
      const loop = findLoop(calibrated!.blocks);
      assert(!!loop, "no LOOP block");
      near(loop!.loopP ?? NaN, REF[STD]!.calibration!.reworkLoopP, "loopP", 0, 1.0);
      return `loopP=${loop!.loopP}`;
    },
  );

  await check(
    "K3",
    "REQUIRED",
    "Task times = median processing time (hours), inputs not mutated",
    () => {
      assert(!!calibrated, "needs K1");
      const ref = REF[STD]!.calibration!.taskTimeMedianHours;
      for (const [name, hours] of Object.entries(ref)) {
        const t = calibrated!.tasks.find((x) => x.name === name);
        assert(!!t, `task ${name} missing`);
        near(t!.time ?? NaN, hours, `time ${name}`, 0.01, 0.01);
      }
      assert(
        imported.tasks.every((t) => (t.time ?? 1) === 1),
        "input tasks were mutated",
      );
      assert(calibrated!.changes.length > 0, "changes[] is empty");
      return `${Object.keys(ref).length} tasks, ${calibrated!.changes.length} changes`;
    },
  );

  await check(
    "K4",
    "REQUIRED",
    "Cycle Time of the calibrated model ≈ mean processing per case",
    () => {
      assert(!!calMod, "needs K1");
      const c = calMod!.calibrateModelFromLog(imported.blocks, imported.tasks, std, {
        timeStat: "mean",
        unit: "hours",
      });
      const total = computeFlow(c.blocks, c.tasks).total;
      near(
        total,
        REF[STD]!.calibration!.expectedProcessingPerCaseHours_meanTimes,
        "computeFlow.total",
        0.02,
      );
      const mins = calMod!.calibrateModelFromLog(imported.blocks, imported.tasks, std, {
        timeStat: "mean",
        unit: "minutes",
      });
      near(computeFlow(mins.blocks, mins.tasks).total, total * 60, "unit=minutes total", 0.005);
      return `computeFlow.total=${total.toFixed(2)} h`;
    },
  );

  await check("K5", "REQUIRED", "XOR branch probabilities survive export → import", async () => {
    const s = (id: string, label: string): Block => ({
      id,
      type: BlockType.SEQ,
      label,
      time: 1,
      mode: BlockMode.SIMPLE,
    });
    const model: Block[] = [
      s("a", "A"),
      {
        id: "x",
        type: BlockType.XOR,
        label: "Approved?",
        branches: [
          { id: "y", label: "Yes", p: 72.5, mode: BlockMode.COMPOSITE, subBlocks: [s("b", "B")] },
          { id: "n", label: "No", p: 27.5, mode: BlockMode.SIMPLE, t: 0 },
        ],
      },
      {
        id: "o",
        type: BlockType.LOOP,
        label: "Rework loop",
        mode: BlockMode.COMPOSITE,
        loopP: 30,
        subBlocks: [
          s("d", "D"),
          {
            id: "x2",
            type: BlockType.XOR,
            label: "Opt?",
            branches: [
              { id: "e", label: "E", p: 40, mode: BlockMode.COMPOSITE, subBlocks: [s("e1", "E")] },
              { id: "k", label: "Skip", p: 60, mode: BlockMode.SIMPLE, t: 0 },
            ],
          },
          {
            id: "i",
            type: BlockType.LOOP,
            label: "Rework loop",
            mode: BlockMode.COMPOSITE,
            loopP: 45,
            subBlocks: [s("g", "G"), s("h", "H")],
          },
        ],
      },
      s("f", "F"),
    ];
    const before = computeFlow(model, []).total;
    const r = await bpmnXmlToBlocks(blocksToSemanticXml(model, "RoundTrip"), []);
    const xor = findXor(r.blocks, "Approved?");
    const ps = (xor?.branches ?? []).map((b) => b.p ?? NaN).sort((a, b) => a - b);
    near(ps[0] ?? NaN, 27.5, "p(No)", 0, 0.5);
    near(ps[1] ?? NaN, 72.5, "p(Yes)", 0, 0.5);
    near(computeFlow(r.blocks, r.tasks).total, before, "cycle time after round-trip", 0.001);
    return `p=${ps.join("/")}, CT ${before.toFixed(3)} preserved`;
  });

  await check(
    "R1",
    "REQUIRED",
    "BPR: long waiting time from the log becomes a 'longWaitTime' issue",
    () => {
      assert(!!calibrated, "needs K1");
      const bpr = analyzeBpr(calibrated!.blocks, calibrated!.tasks, "hours", std);
      const issue = bpr.issues.find(
        (i) => i.type === "longWaitTime" && i.affectedTaskNames.includes("FE Lead Review"),
      );
      assert(
        !!issue,
        `issues: ${bpr.issues.map((i) => `${i.type}:${i.affectedTaskNames.join("/")}`).join(", ")}`,
      );
      return `${issue!.severity}: ${issue!.evidence}`;
    },
  );

  console.log("\nPerformance & calibration acceptance checks\n");
  for (const r of results) {
    console.log(`${r.pass ? "PASS" : "FAIL"}  [${r.level}] ${r.id} ${r.title}\n      ${r.detail}`);
  }
  const failed = results.filter((r) => !r.pass && r.level === "REQUIRED").length;
  console.log(
    `\n${failed === 0 ? "ALL REQUIRED CHECKS PASSED" : `${failed} REQUIRED CHECK(S) FAILED`}`,
  );
  process.exit(failed === 0 ? 0 : 1);
}

void main();
