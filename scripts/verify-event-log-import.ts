/**
 * Acceptance checks for importing the "FE Development & Code Review" BPMN + event logs.
 * Runs the real services headlessly (no browser):
 *
 *   npx tsx scripts/verify-event-log-import.ts
 *
 * Exit code 0 = every REQUIRED check passed. See docs/fixes/EVENT_LOG_IMPORT_FIX.md.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { bpmnXmlToBlocks } from "@/services/bpmn";
import { blocksToSemanticXml } from "@/services/bpmn-builder";
import { parseEventLogCsv, parseEventLogXes } from "@/services/event-log-parser";
import { analyzeConformance } from "@/services/conformance";
import { PROCESS_TEMPLATES } from "@/constants/templates";
import {
  BlockMode,
  BlockType,
  type Block,
  type Branch,
  type EventLogItem,
  type Task,
} from "@/types";

const FIXTURES = path.join(process.cwd(), "docs/fixes/fixtures");
const read = (name: string): string =>
  readFileSync(path.join(FIXTURES, name), "utf8").replace(/^﻿/, "");

/** The 12 activities that appear in the event logs (= task names in the BPMN). */
const LOG_ACTIVITIES = [
  "Receive Task on ClickUp",
  "Analyze Spec, Figma, API",
  "Ask PM to Clarify Spec",
  "Clarify Spec",
  "Create New Branch",
  "Write Code & Integrate",
  "Integrate Real API",
  "Create Pull Request",
  "AI Bot Code Review",
  "Fix Review Comments",
  "FE Lead Review",
  "Merge Code",
];
/** Flow labels / events that must NEVER become activities. */
const NOT_ACTIVITIES = ["Yes", "No", "Approved", "Request changes", "API ready", "No (mock data)"];

type Level = "REQUIRED" | "PHASE-2";
interface CheckResult {
  id: string;
  level: Level;
  title: string;
  pass: boolean;
  detail: string;
}
const results: CheckResult[] = [];

async function check(
  id: string,
  level: Level,
  title: string,
  fn: () => Promise<string> | string,
): Promise<void> {
  try {
    const detail = await fn();
    results.push({ id, level, title, pass: true, detail });
  } catch (err) {
    results.push({ id, level, title, pass: false, detail: (err as Error).message.slice(0, 300) });
  }
}

function assert(cond: boolean, message: string): void {
  if (!cond) throw new Error(message);
}

/** Collects activity names and assigned resources from a block tree. */
function collectActivities(blocks: Block[], tasks: Task[]): Map<string, string | undefined> {
  const out = new Map<string, string | undefined>();
  const nameOf = (taskId: string | null | undefined, label: string): string =>
    tasks.find((t) => t.id === taskId)?.name ?? label;
  const resOf = (taskId: string | null | undefined, res?: string): string | undefined =>
    res ?? tasks.find((t) => t.id === taskId)?.resource;

  const walkBranch = (br: Branch): void => {
    if (br.mode === BlockMode.COMPOSITE && br.subBlocks?.length) walk(br.subBlocks);
    else if (br.taskId) out.set(nameOf(br.taskId, br.label), resOf(br.taskId, br.resource));
  };
  const walk = (list: Block[]): void => {
    for (const b of list) {
      if (b.subBlocks?.length) walk(b.subBlocks);
      if (b.branches?.length) b.branches.forEach(walkBranch);
      const isLeaf =
        (b.type === BlockType.SEQ || b.type === BlockType.LOOP) && !b.subBlocks?.length;
      if (isLeaf) out.set(nameOf(b.taskId, b.label), resOf(b.taskId, b.resource));
    }
  };
  walk(blocks);
  return out;
}

function parseGroundTruth(): Map<string, string[]> {
  const rows = read("ground_truth_tinh_huong.csv").trim().split(/\r?\n/).slice(1);
  const gt = new Map<string, string[]>();
  for (const row of rows) {
    const [caseId, types] = row.split(",");
    gt.set(caseId!, types ? types.split(";").filter(Boolean) : []);
  }
  return gt;
}

const durationStats = (ev: EventLogItem[]): string => {
  const d = ev.map((e) => e.duration);
  return `distinct=${new Set(d).size} min=${Math.min(...d)} max=${Math.max(...d)}`;
};

async function main(): Promise<void> {
  const bpmnXml = read("FE_Code_Review.bpmn");
  let blocks: Block[] = [];
  let tasks: Task[] = [];

  await check("B1", "REQUIRED", "Import FE_Code_Review.bpmn without crashing", async () => {
    const res = await bpmnXmlToBlocks(bpmnXml, []);
    blocks = res.blocks;
    tasks = res.tasks;
    assert(blocks.length > 0, "no blocks produced");
    return `${blocks.length} top-level blocks, warnings: ${JSON.stringify(res.warnings)}`;
  });

  await check("B2", "REQUIRED", "Round-trip: app-exported composite loop re-imports", async () => {
    const loopModel: Block[] = [
      { id: "a", type: BlockType.SEQ, label: "A", time: 1 },
      {
        id: "l",
        type: BlockType.LOOP,
        label: "Rework loop",
        mode: BlockMode.COMPOSITE,
        loopP: 30,
        subBlocks: [
          { id: "b", type: BlockType.SEQ, label: "B", time: 1 },
          { id: "c", type: BlockType.SEQ, label: "C", time: 1 },
        ],
      },
      { id: "d", type: BlockType.SEQ, label: "D", time: 1 },
    ];
    const res = await bpmnXmlToBlocks(blocksToSemanticXml(loopModel, "RoundTrip"), []);
    const types = res.blocks.map((b) => b.type);
    assert(types.includes(BlockType.LOOP), `no loop block after re-import: ${types.join(",")}`);
    const acts = [...collectActivities(res.blocks, res.tasks).keys()];
    assert(
      ["A", "B", "C", "D"].every((x) => acts.includes(x)),
      `activities: ${acts.join(",")}`,
    );
    return `blocks: ${types.join(" → ")}`;
  });

  await check(
    "B5",
    "REQUIRED",
    "Regression: built-in templates round-trip (export → import)",
    async () => {
      const problems: string[] = [];
      for (const tpl of PROCESS_TEMPLATES) {
        const before = [...collectActivities(tpl.blocks, tpl.tasks).keys()].sort();
        try {
          const xml = blocksToSemanticXml(tpl.blocks, tpl.id, tpl.tasks);
          const res = await bpmnXmlToBlocks(xml, []);
          const after = [...collectActivities(res.blocks, res.tasks).keys()].sort();
          if (before.join("|") !== after.join("|")) {
            problems.push(`${tpl.id}: before=[${before.join(", ")}] after=[${after.join(", ")}]`);
          }
        } catch (err) {
          problems.push(`${tpl.id}: ${(err as Error).message}`);
        }
      }
      assert(problems.length === 0, problems.join(" ; "));
      return `${PROCESS_TEMPLATES.length} templates OK`;
    },
  );

  await check("B3", "REQUIRED", "Imported model contains exactly the 12 log activities", () => {
    const acts = [...collectActivities(blocks, tasks).keys()];
    const missing = LOG_ACTIVITIES.filter((a) => !acts.includes(a));
    const extra = acts.filter((a) => !LOG_ACTIVITIES.includes(a));
    const fake = acts.filter((a) => NOT_ACTIVITIES.includes(a));
    assert(missing.length === 0, `missing: ${missing.join(" | ")}`);
    assert(fake.length === 0 && extra.length === 0, `extra/fake activities: ${extra.join(" | ")}`);
    return "12/12 activities, no gateway/flow labels or events as tasks";
  });

  await check("B4", "PHASE-2", "Lanes are mapped to resources (role) of tasks", () => {
    const res = collectActivities(blocks, tasks);
    const expect: Record<string, string> = {
      "FE Lead Review": "FE Lead",
      "AI Bot Code Review": "AI System",
      "Clarify Spec": "PM / BA",
      "Merge Code": "FE Dev",
    };
    const wrong = Object.entries(expect).filter(([a, lane]) => res.get(a) !== lane);
    assert(wrong.length === 0, `got: ${wrong.map(([a]) => `${a}=${res.get(a)}`).join(", ")}`);
    return "lane → resource OK";
  });

  const csvStd = parseEventLogCsv(read("event_log_chuan.csv"));
  const csvSc = parseEventLogCsv(read("event_log_tinh_huong.csv"));

  await check("L1", "REQUIRED", "CSV: end_timestamp column is recognised (real durations)", () => {
    const sameTs = csvStd.filter((e) => e.startTimestamp === e.completeTimestamp).length;
    assert(
      sameTs / csvStd.length < 0.01,
      `${sameTs}/${csvStd.length} events have start == complete`,
    );
    const bot = csvStd.filter((e) => e.activity === "AI Bot Code Review");
    assert(
      bot.every((e) => e.duration < 1),
      "AI Bot Code Review should take minutes, not 1h",
    );
    return `events=${csvStd.length} cases=${new Set(csvStd.map((e) => e.caseId)).size} ${durationStats(csvStd)}`;
  });

  await check("C1", "REQUIRED", "Conformance: standard log is 100% conformant", () => {
    assert(blocks.length > 0, "needs B1");
    const c = analyzeConformance(csvStd, blocks, tasks);
    const bad = c.caseResults.filter((r) => !r.isConformant);
    const sample = bad[0]?.violations
      .slice(0, 3)
      .map((v) => `${v.type}:${v.activity}`)
      .join(", ");
    assert(
      bad.length === 0,
      `${bad.length}/${c.totalCases} non-conformant, e.g. ${bad[0]?.caseId}: ${sample}`,
    );
    return `fitness=${c.overallFitnessScore} conformant=${c.conformantCases}/${c.totalCases}`;
  });

  await check(
    "C2",
    "REQUIRED",
    "Conformance: injected control-flow deviations are detected",
    () => {
      assert(blocks.length > 0, "needs B1");
      const gt = parseGroundTruth();
      const c = analyzeConformance(csvSc, blocks, tasks);
      const flagged = new Set(c.caseResults.filter((r) => !r.isConformant).map((r) => r.caseId));
      const mustFlag = [...gt.entries()].filter(([, t]) =>
        t.some((x) => x === "skip_bot" || x === "merge_before_approve"),
      );
      const missed = mustFlag.filter(([id]) => !flagged.has(id)).map(([id]) => id);
      const allowed = new Set([
        "skip_bot",
        "merge_before_approve",
        "spec_pingpong",
        "wrong_role",
        "skip_lead",
        "ignore_bot",
      ]);
      const falsePos = [...flagged].filter((id) => !(gt.get(id) ?? []).some((t) => allowed.has(t)));
      assert(missed.length === 0, `missed: ${missed.join(", ")}`);
      assert(falsePos.length === 0, `false positives: ${falsePos.slice(0, 8).join(", ")}`);
      return `flagged=${flagged.size}, recall skip_bot+merge_before_approve=${mustFlag.length}/${mustFlag.length}`;
    },
  );

  await check(
    "C3",
    "PHASE-2",
    "Conformance: wrong_role (Dev_02 doing FE Lead Review) detected",
    () => {
      const gt = parseGroundTruth();
      const c = analyzeConformance(csvSc, blocks, tasks);
      const ids = [...gt.entries()].filter(([, t]) => t.includes("wrong_role")).map(([id]) => id);
      const hit = ids.filter((id) =>
        c.caseResults
          .find((r) => r.caseId === id)
          ?.violations.some((v) => v.type === "wrong_resource"),
      );
      assert(hit.length === ids.length, `detected ${hit.length}/${ids.length}`);
      return `${hit.length}/${ids.length}`;
    },
  );

  await check("X1", "REQUIRED", "XES: same events as CSV, names decoded, durations read", () => {
    const xes = parseEventLogXes(read("event_log_chuan.xes"));
    const names = new Set(xes.map((e) => e.activity));
    assert(xes.length === csvStd.length, `events xes=${xes.length} csv=${csvStd.length}`);
    assert(
      !names.has("Unknown Activity"),
      "'Unknown Activity' present (attribute regex state bug)",
    );
    assert(![...names].some((n) => n.includes("&amp;")), "XML entities not decoded (&amp;)");
    assert(
      LOG_ACTIVITIES.every((a) => names.has(a)),
      "activity names differ from CSV",
    );
    const sameTs = xes.filter((e) => e.startTimestamp === e.completeTimestamp).length;
    assert(
      sameTs / xes.length < 0.01,
      `start_timestamp ignored: ${sameTs} events start == complete`,
    );
    return `events=${xes.length} ${durationStats(xes)}`;
  });

  console.log("\nEvent-log import acceptance checks\n");
  for (const r of results) {
    console.log(`${r.pass ? "PASS" : "FAIL"}  [${r.level}] ${r.id} ${r.title}\n      ${r.detail}`);
  }
  const failedRequired = results.filter((r) => !r.pass && r.level === "REQUIRED").length;
  console.log(
    `\n${failedRequired === 0 ? "ALL REQUIRED CHECKS PASSED" : `${failedRequired} REQUIRED CHECK(S) FAILED`}`,
  );
  process.exit(failedRequired === 0 ? 0 : 1);
}

void main();
