/**
 * Acceptance checks for the Graph Embedding tab: Node2Vec (BPMN graph / handover network) and
 * Graph2Vec + WL kernel anomaly detection on event-log trace graphs.
 *
 *   npx tsx scripts/verify-graph-embedding.ts
 *
 * Exit code 0 = every REQUIRED check passed. Spec: docs/fixes/GRAPH_EMBEDDING_FEATURE.md.
 * Reference numbers: docs/fixes/fixtures/embedding_reference.json (Python: numpy / scikit-learn / gensim).
 * The new module is loaded at runtime so this file type-checks before it exists; the contract below
 * MUST be implemented exactly by services/graph-embedding (barrel index.ts).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { bpmnXmlToBlocks } from "@/services/bpmn";
import { buildProcessGraph } from "@/services/graph";
import { parseEventLogCsv } from "@/services/event-log-parser";
import { buildSocialNetwork } from "@/services/social-network";
import { PROCESS_TEMPLATES } from "@/constants/templates";
import type { EventLogItem, ProcessGraph, SocialNetworkData } from "@/types";

// ---------------------------------------------------------------------------
// API contract
// ---------------------------------------------------------------------------
interface LabeledGraph {
  nodes: { id: string; label: string }[];
  edges: { source: string; target: string; weight?: number }[];
}
interface Node2VecOptions {
  dimensions?: number;
  walkLength?: number;
  numWalks?: number;
  p?: number;
  q?: number;
  window?: number;
  negative?: number;
  epochs?: number;
  learningRate?: number;
  minLearningRate?: number;
  seed?: number;
}
interface Graph2VecOptions {
  dimensions?: number;
  epochs?: number;
  negative?: number;
  learningRate?: number;
  minLearningRate?: number;
  seed?: number;
}
interface AnomalyEvaluation {
  byType: Record<string, { count: number; auc: number }>;
  any: { count: number; auc: number };
  precisionAtN: number;
}
interface GraphEmbeddingModule {
  node2vecTransitionProbabilities: (
    graph: LabeledGraph,
    previous: string | null,
    current: string,
    p: number,
    q: number,
  ) => Record<string, number>;
  node2vec: (graph: LabeledGraph, options?: Node2VecOptions) => Record<string, number[]>;
  processGraphToLabeledGraph: (pg: ProcessGraph) => LabeledGraph;
  socialNetworkToLabeledGraph: (sn: SocialNetworkData) => LabeledGraph;
  kMeans: (
    vectors: number[][],
    k: number,
    options?: { seed?: number; nInit?: number; maxIter?: number },
  ) => { labels: number[]; centroids: number[][]; inertia: number };
  pca2d: (vectors: number[][]) => [number, number][];
  cosineSimilarity: (a: number[], b: number[]) => number;
  buildTraceGraphs: (
    events: EventLogItem[],
    options?: { timeAware?: boolean; slowQuantile?: number; attributeKeys?: string[] },
  ) => { caseId: string; graph: LabeledGraph }[];
  wlSubtreeFeatures: (graph: LabeledGraph, iterations?: number) => string[];
  wlKernelVectors: (docs: string[][]) => number[][];
  wlKernelSimilarity: (a: LabeledGraph, b: LabeledGraph, iterations?: number) => number;
  graph2vec: (docs: string[][], options?: Graph2VecOptions) => number[][];
  knnAnomalyScores: (vectors: number[][], k?: number) => number[];
  parseGroundTruthCsv: (text: string) => Record<string, string[]>;
  evaluateAnomalyScores: (
    caseIds: string[],
    scores: number[],
    groundTruth: Record<string, string[]>,
  ) => AnomalyEvaluation;
}

// ---------------------------------------------------------------------------
const FIXTURES = path.join(process.cwd(), "docs/fixes/fixtures");
const read = (name: string): string =>
  readFileSync(path.join(FIXTURES, name), "utf8").replace(/^﻿/, "");

type ModeKey = "structure" | "timeAware" | "timeAndAttributes";
interface RefMode {
  featureCountPerCase: Record<string, number>;
  distinctFeatures: number;
  wlKernelScores: Record<string, number>;
  wlKernelAuc: Record<string, { count: number; auc: number }>;
  graph2vecAucMean: Record<string, number>;
  slowEvents?: number;
}
const REF = JSON.parse(read("embedding_reference.json")) as Record<ModeKey, RefMode>;
const MODES: Record<ModeKey, { timeAware?: boolean; attributeKeys?: string[] }> = {
  structure: {},
  timeAware: { timeAware: true },
  timeAndAttributes: { timeAware: true, attributeKeys: ["review_result"] },
};

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
async function load<T>(modulePath: string): Promise<T> {
  const spec: string = modulePath; // runtime-only import (module may not exist yet)
  return (await import(spec)) as T;
}
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

async function main(): Promise<void> {
  const fixture = await bpmnXmlToBlocks(read("FE_Code_Review.bpmn"), []);
  const pg = buildProcessGraph(fixture.blocks, fixture.tasks);
  const sc = parseEventLogCsv(read("event_log_tinh_huong.csv"));
  const gt: Record<string, string[]> = {};
  read("ground_truth_tinh_huong.csv")
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .forEach((r) => {
      const [c, t] = r.split(",");
      gt[c!] = t ? t.split(";").filter(Boolean) : [];
    });

  let M: GraphEmbeddingModule | null = null;
  const mod = (): GraphEmbeddingModule => {
    assert(!!M, "services/graph-embedding not loaded (see E0)");
    return M!;
  };

  await check(
    "G0",
    "REQUIRED",
    "Process graph (BP2Graph): empty XOR branches are edges, not fake tasks",
    () => {
      const fake = pg.nodes.filter(
        (n) => n.shape === "task" && ["Yes", "No", "Approved"].includes(n.name),
      );
      assert(fake.length === 0, `fake task nodes: ${fake.map((n) => n.name).join(", ")}`);
      assert(
        pg.nodes.length === 25 && pg.edges.length === 30,
        `nodes ${pg.nodes.length}/25, edges ${pg.edges.length}/30`,
      );
      const p2p = PROCESS_TEMPLATES.find((t) => t.id === "p2p")!;
      const g2 = buildProcessGraph(p2p.blocks, p2p.tasks);
      assert(
        !g2.nodes.some((n) => n.name === "Rejected"),
        "p2p template still has a 'Rejected' task node",
      );
      return `fixture: ${pg.nodes.length} nodes, ${pg.edges.length} edges`;
    },
  );

  await check("E0", "REQUIRED", "services/graph-embedding exports the contract", async () => {
    M = await load<GraphEmbeddingModule>("@/services/graph-embedding");
    const missing = [
      "node2vecTransitionProbabilities",
      "node2vec",
      "processGraphToLabeledGraph",
      "socialNetworkToLabeledGraph",
      "kMeans",
      "pca2d",
      "cosineSimilarity",
      "buildTraceGraphs",
      "wlSubtreeFeatures",
      "wlKernelVectors",
      "wlKernelSimilarity",
      "graph2vec",
      "knnAnomalyScores",
      "parseGroundTruthCsv",
      "evaluateAnomalyScores",
    ].filter((k) => typeof (M as unknown as Record<string, unknown>)[k] !== "function");
    assert(missing.length === 0, `missing: ${missing.join(", ")}`);
    return "15 functions";
  });

  // ---------------- Node2Vec ----------------
  await check(
    "N1",
    "REQUIRED",
    "2nd-order random walk transition probabilities (p=0.5, q=2)",
    () => {
      const g: LabeledGraph = {
        nodes: ["a", "b", "c", "d"].map((id) => ({ id, label: id })),
        edges: [
          ["a", "b"],
          ["b", "c"],
          ["b", "d"],
          ["c", "d"],
          ["a", "c"],
        ].map(([s, t]) => ({ source: s!, target: t! })),
      };
      const pr = mod().node2vecTransitionProbabilities(g, "a", "b", 0.5, 2);
      const exp: Record<string, number> = { a: 2 / 3.5, c: 1 / 3.5, d: 0.5 / 3.5 };
      for (const k of Object.keys(exp))
        assert(Math.abs((pr[k] ?? NaN) - exp[k]!) < 1e-9, `P(${k}) = ${pr[k]}, expected ${exp[k]}`);
      const first = mod().node2vecTransitionProbabilities(g, null, "b", 0.5, 2);
      assert(
        Object.values(first).every((v) => Math.abs(v - 1 / 3) < 1e-9),
        "first step must be uniform (unweighted)",
      );
      return "a 0.571 · c 0.286 · d 0.143";
    },
  );

  await check(
    "N2",
    "REQUIRED",
    "Node2Vec is deterministic per seed, finite, correct dimension",
    () => {
      const g = mod().processGraphToLabeledGraph(pg);
      const a = mod().node2vec(g, { seed: 7, numWalks: 10 });
      const b = mod().node2vec(g, { seed: 7, numWalks: 10 });
      const c = mod().node2vec(g, { seed: 8, numWalks: 10 });
      const ids = Object.keys(a);
      assert(ids.length === g.nodes.length, `${ids.length} vectors for ${g.nodes.length} nodes`);
      assert(
        ids.every((k) => a[k]!.length === 16 && a[k]!.every(Number.isFinite)),
        "dimension 16 / finite",
      );
      assert(
        ids.every((k) => a[k]!.every((v, i) => v === b[k]![i])),
        "same seed → different vectors",
      );
      assert(
        ids.some((k) => a[k]!.some((v, i) => v !== c[k]![i])),
        "different seed → identical vectors",
      );
      return `${ids.length} nodes × 16`;
    },
  );

  await check(
    "N3",
    "REQUIRED",
    "Two communities (2 × K6 + bridge) are recovered by k-means",
    () => {
      const L = [0, 1, 2, 3, 4, 5].map((i) => `L${i}`);
      const R = [0, 1, 2, 3, 4, 5].map((i) => `R${i}`);
      const edges: LabeledGraph["edges"] = [];
      for (const side of [L, R])
        for (let i = 0; i < 6; i++)
          for (let j = i + 1; j < 6; j++) edges.push({ source: side[i]!, target: side[j]! });
      edges.push({ source: "L0", target: "R0" });
      const g: LabeledGraph = { nodes: [...L, ...R].map((id) => ({ id, label: id })), edges };
      let perfect = 0;
      for (let seed = 1; seed <= 5; seed++) {
        const emb = mod().node2vec(g, { seed, numWalks: 20, p: 1, q: 2 });
        const ids = [...L, ...R];
        const lab = mod().kMeans(
          ids.map((id) => emb[id]!),
          2,
          { seed: 0 },
        ).labels;
        const left = new Set(lab.slice(0, 6));
        const right = new Set(lab.slice(6));
        if (left.size === 1 && right.size === 1 && [...left][0] !== [...right][0]) perfect++;
      }
      assert(perfect >= 4, `perfect split in ${perfect}/5 seeds`);
      return `perfect split ${perfect}/5 seeds`;
    },
  );

  await check(
    "N4",
    "REQUIRED",
    "BPMN fixture: review-loop steps are neighbours in embedding space",
    () => {
      const g = mod().processGraphToLabeledGraph(pg);
      const byLabel = (l: string) => g.nodes.filter((n) => n.label === l).map((n) => n.id);
      const fix: number[] = [];
      const diff: number[] = [];
      for (const seed of [1, 2, 3]) {
        const e = mod().node2vec(g, { seed, numWalks: 50 });
        const maxCos = (a: string, b: string) =>
          Math.max(
            ...byLabel(a).flatMap((x) =>
              byLabel(b).map((y) => mod().cosineSimilarity(e[x]!, e[y]!)),
            ),
          );
        const bf = maxCos("AI Bot Code Review", "Fix Review Comments");
        fix.push(bf);
        diff.push(bf - maxCos("AI Bot Code Review", "Receive Task on ClickUp"));
      }
      assert(mean(fix) >= 0.5, `mean cos(Bot, Fix) = ${mean(fix).toFixed(3)} < 0.5`);
      assert(
        mean(diff) >= 0.6,
        `mean cos(Bot,Fix) − cos(Bot,Receive) = ${mean(diff).toFixed(3)} < 0.6`,
      );
      return `cos(Bot,Fix) ${mean(fix).toFixed(3)}, gap vs Receive ${mean(diff).toFixed(3)}`;
    },
  );

  await check("N5", "REQUIRED", "Handover network → Node2Vec; k-means & PCA deterministic", () => {
    const g = mod().socialNetworkToLabeledGraph(buildSocialNetwork(sc, "handover"));
    const e = mod().node2vec(g, { seed: 3, numWalks: 30 });
    const X = g.nodes.map((n) => e[n.id]!);
    assert(X.length === 8 && X.every((v) => v.length === 16), `${X.length} resources`);
    const k1 = mod().kMeans(X, 3, { seed: 5 });
    const k2 = mod().kMeans(X, 3, { seed: 5 });
    assert(
      k1.labels.join() === k2.labels.join() && new Set(k1.labels).size === 3,
      "k-means not deterministic / not 3 clusters",
    );
    const xy = mod().pca2d(X);
    assert(xy.length === 8 && xy.flat().every(Number.isFinite), "pca2d");
    return `clusters ${k1.labels.join("")}`;
  });

  // ---------------- Trace graphs + WL kernel (deterministic, exact) ----------------
  await check("T1", "REQUIRED", "Trace graphs: START → events → END chain, SLOW labels", () => {
    const tg = mod().buildTraceGraphs(sc, MODES.timeAware);
    const perCase = new Map<string, number>();
    sc.forEach((e) => perCase.set(e.caseId, (perCase.get(e.caseId) ?? 0) + 1));
    assert(tg.length === perCase.size, `${tg.length} graphs for ${perCase.size} cases`);
    for (const { caseId, graph } of tg) {
      const n = perCase.get(caseId)!;
      assert(
        graph.nodes.length === n + 2 && graph.edges.length === n + 1,
        `${caseId}: nodes ${graph.nodes.length} edges ${graph.edges.length}`,
      );
      assert(
        graph.nodes[0]!.label === "START" && graph.nodes[n + 1]!.label === "END",
        `${caseId}: START/END`,
      );
    }
    const slow = tg.flatMap((t) => t.graph.nodes).filter((n) => n.label.includes("|SLOW")).length;
    assert(
      slow === REF.timeAware.slowEvents,
      `SLOW events ${slow}, expected ${REF.timeAware.slowEvents}`,
    );
    return `${tg.length} graphs, ${slow} SLOW events`;
  });

  for (const mode of Object.keys(MODES) as ModeKey[]) {
    await check(
      `W-${mode}`,
      "REQUIRED",
      `WL features + WL-kernel kNN scores + AUC exact (${mode})`,
      () => {
        const tg = mod().buildTraceGraphs(sc, MODES[mode]);
        const ids = tg.map((t) => t.caseId);
        const docs = tg.map((t) => mod().wlSubtreeFeatures(t.graph, 2));
        const ref = REF[mode];
        ids.forEach((c, i) =>
          assert(
            docs[i]!.length === ref.featureCountPerCase[c],
            `${c}: ${docs[i]!.length} features`,
          ),
        );
        const distinct = new Set(docs.flat()).size;
        assert(
          distinct === ref.distinctFeatures,
          `distinct features ${distinct}, expected ${ref.distinctFeatures}`,
        );
        const scores = mod().knnAnomalyScores(mod().wlKernelVectors(docs), 20);
        const worst = Math.max(...ids.map((c, i) => Math.abs(scores[i]! - ref.wlKernelScores[c]!)));
        assert(worst < 1e-6, `max |score − reference| = ${worst}`);
        const ev = mod().evaluateAnomalyScores(ids, scores, gt);
        for (const [t, r] of Object.entries(ref.wlKernelAuc)) {
          const got =
            t === "ANY" ? ev.any.auc : t === "precision@N" ? ev.precisionAtN : ev.byType[t]?.auc;
          assert(got !== undefined && Math.abs(got - r.auc) < 1e-6, `${t}: ${got} vs ${r.auc}`);
        }
        return `AUC any ${ev.any.auc.toFixed(3)}, precision@N ${ev.precisionAtN.toFixed(3)}`;
      },
    );
  }

  await check(
    "S1",
    "REQUIRED",
    "WL kernel similarity between two process graphs (AS-IS vs variant)",
    () => {
      const g = mod().processGraphToLabeledGraph(pg);
      const variant: LabeledGraph = {
        ...g,
        nodes: g.nodes.map((n) =>
          n.label === "FE Lead Review" ? { ...n, label: "Peer Review" } : n,
        ),
      };
      const self = mod().wlKernelSimilarity(g, g);
      const ab = mod().wlKernelSimilarity(g, variant);
      const ba = mod().wlKernelSimilarity(variant, g);
      assert(Math.abs(self - 1) < 1e-9, `self ${self}`);
      assert(Math.abs(ab - ba) < 1e-12, "not symmetric");
      assert(ab > 0.5 && ab < 1, `similarity ${ab}`);
      return `sim(AS-IS, variant) = ${ab.toFixed(3)}`;
    },
  );

  // ---------------- Graph2Vec (seeded, thresholds) ----------------
  const g2vAuc: Partial<Record<ModeKey, Record<string, number>>> = {};
  await check("G1", "REQUIRED", "Graph2Vec (PV-DBOW) is deterministic and fast enough", () => {
    const tg = mod().buildTraceGraphs(sc, MODES.structure);
    const docs = tg.map((t) => mod().wlSubtreeFeatures(t.graph, 2));
    const t0 = Date.now();
    const a = mod().graph2vec(docs, { seed: 11 });
    const ms = Date.now() - t0;
    const b = mod().graph2vec(docs, { seed: 11 });
    assert(
      a.length === docs.length && a.every((v) => v.length === 32 && v.every(Number.isFinite)),
      "shape 159 × 32",
    );
    assert(
      a.every((v, i) => v.every((x, j) => x === b[i]![j])),
      "same seed → different vectors",
    );
    assert(ms < 15000, `${ms} ms (> 15 s)`);
    return `${docs.length} × 32 in ${ms} ms`;
  });

  for (const mode of Object.keys(MODES) as ModeKey[]) {
    await check(
      `G2-${mode}`,
      "REQUIRED",
      `Graph2Vec anomaly AUC (mean of seeds 1–3, ${mode})`,
      () => {
        const tg = mod().buildTraceGraphs(sc, MODES[mode]);
        const ids = tg.map((t) => t.caseId);
        const docs = tg.map((t) => mod().wlSubtreeFeatures(t.graph, 2));
        const runs = [1, 2, 3].map((seed) =>
          mod().evaluateAnomalyScores(
            ids,
            mod().knnAnomalyScores(mod().graph2vec(docs, { seed }), 20),
            gt,
          ),
        );
        const aucOf = (t: string) =>
          mean(runs.map((r) => (t === "ANY" ? r.any.auc : r.byType[t]!.auc)));
        const thresholds: Record<ModeKey, Record<string, number>> = {
          structure: { spec_pingpong: 0.88, merge_before_approve: 0.9, excessive_rework: 0.8 },
          timeAware: { bot_overload: 0.82, api_long_wait: 0.78, lead_absent: 0.85, ANY: 0.76 },
          timeAndAttributes: { ignore_bot: 0.82, ANY: 0.8 },
        };
        const all = [
          "ANY",
          ...Object.keys(REF[mode].wlKernelAuc).filter((t) => t !== "ANY" && t !== "precision@N"),
        ];
        g2vAuc[mode] = Object.fromEntries(all.map((t) => [t, aucOf(t)]));
        const fails = Object.entries(thresholds[mode]).filter(([t, min]) => aucOf(t) < min);
        assert(
          fails.length === 0,
          fails.map(([t, min]) => `${t} ${aucOf(t).toFixed(3)} < ${min}`).join("; "),
        );
        return Object.entries(thresholds[mode])
          .map(([t]) => `${t} ${aucOf(t).toFixed(3)}`)
          .join(" · ");
      },
    );
  }

  await check(
    "G3",
    "REQUIRED",
    "Finding: time / data labels reveal what structure alone misses",
    () => {
      const s = g2vAuc.structure;
      const ta = g2vAuc.timeAware;
      const at = g2vAuc.timeAndAttributes;
      assert(!!s && !!ta && !!at, "needs G2-*");
      const d1 = ta!.bot_overload! - s!.bot_overload!;
      const d2 = at!.ignore_bot! - ta!.ignore_bot!;
      assert(d1 >= 0.2, `bot_overload gain ${d1.toFixed(3)} < 0.2`);
      assert(d2 >= 0.2, `ignore_bot gain ${d2.toFixed(3)} < 0.2`);
      return `bot_overload ${s!.bot_overload!.toFixed(2)} → ${ta!.bot_overload!.toFixed(2)}; ignore_bot ${ta!.ignore_bot!.toFixed(2)} → ${at!.ignore_bot!.toFixed(2)}`;
    },
  );

  console.log("\nGraph embedding acceptance checks\n");
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
