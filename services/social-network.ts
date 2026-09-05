import {
  type EventLogItem,
  type SocialMetricType,
  type SocialNetworkData,
  type SocialNetworkEdge,
  type SocialNetworkNode,
  type SocialEvaluationRow,
} from "@/types";

const ROLE_COLORS = [
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#f97316", // Orange
  "#6366f1", // Indigo
  "#14b8a6", // Teal
];

export function buildSocialNetwork(
  events: EventLogItem[],
  metric: SocialMetricType = "handover",
  minWeight = 1,
): SocialNetworkData {
  if (events.length === 0) {
    return {
      metric,
      nodes: [],
      edges: [],
      evaluations: [],
      maxEdgeWeight: 0,
      totalInteractions: 0,
    };
  }

  // 1. Group events by Case ID
  const traces = new Map<string, EventLogItem[]>();
  const activityCounts: Record<string, number> = {};

  for (const e of events) {
    const list = traces.get(e.caseId) || [];
    list.push(e);
    traces.set(e.caseId, list);

    activityCounts[e.resource] = (activityCounts[e.resource] || 0) + 1;
  }

  const allResources = Object.keys(activityCounts);
  const handoversSent: Record<string, number> = {};
  const handoversReceived: Record<string, number> = {};
  const workingTogetherCounts: Record<string, number> = {};

  // Edge key -> count
  const edgeWeights = new Map<string, number>();

  if (metric === "handover") {
    // Handover of Work: consecutive activities within the same case with different resources
    for (const caseEvents of traces.values()) {
      const sorted = [...caseEvents].sort(
        (a, b) => new Date(a.startTimestamp).getTime() - new Date(b.startTimestamp).getTime(),
      );

      for (let i = 0; i < sorted.length - 1; i++) {
        const source = sorted[i].resource;
        const target = sorted[i + 1].resource;

        if (source !== target) {
          const key = `${source}-->${target}`;
          edgeWeights.set(key, (edgeWeights.get(key) || 0) + 1);
          handoversSent[source] = (handoversSent[source] || 0) + 1;
          handoversReceived[target] = (handoversReceived[target] || 0) + 1;
        }
      }
    }
  } else {
    // Working Together: co-occurrence of resources in the same case
    for (const caseEvents of traces.values()) {
      const caseResources = Array.from(new Set(caseEvents.map((e) => e.resource)));
      for (let i = 0; i < caseResources.length; i++) {
        for (let j = i + 1; j < caseResources.length; j++) {
          const rA = caseResources[i];
          const rB = caseResources[j];
          const [source, target] = [rA, rB].sort();
          const key = `${source}<->${target}`;
          edgeWeights.set(key, (edgeWeights.get(key) || 0) + 1);

          workingTogetherCounts[source] = (workingTogetherCounts[source] || 0) + 1;
          workingTogetherCounts[target] = (workingTogetherCounts[target] || 0) + 1;
        }
      }
    }
  }

  // 2. Build Nodes with Circular Layout (optimized to prevent canvas clipping)
  const n = allResources.length;
  const centerX = 400;
  const centerY = 260;
  const radius = Math.max(140, Math.min(185, 36 * (n || 1)));

  const nodes: SocialNetworkNode[] = allResources.map((res, i) => {
    const angle = (2 * Math.PI * i) / (n || 1) - Math.PI / 2;
    const x = Math.round(centerX + radius * Math.cos(angle));
    const y = Math.round(centerY + radius * Math.sin(angle));

    return {
      id: res,
      label: res,
      activityCount: activityCounts[res] || 0,
      handoversSent: handoversSent[res] || 0,
      handoversReceived: handoversReceived[res] || 0,
      workingTogetherCount: workingTogetherCounts[res] || 0,
      color: ROLE_COLORS[i % ROLE_COLORS.length],
      x,
      y,
    };
  });

  // 3. Build Edges
  let maxWeight = 0;
  let totalInteractions = 0;
  const edges: SocialNetworkEdge[] = [];

  for (const [key, weight] of edgeWeights.entries()) {
    totalInteractions += weight;
    if (weight > maxWeight) maxWeight = weight;

    if (weight >= minWeight) {
      if (metric === "handover") {
        const [source, target] = key.split("-->");
        edges.push({
          id: `edge-${key}`,
          source,
          target,
          weight,
          metric,
        });
      } else {
        const [source, target] = key.split("<->");
        edges.push({
          id: `edge-${key}`,
          source,
          target,
          weight,
          metric,
        });
      }
    }
  }

  // 4. Build Distinct Edges for Graph Topology & Centrality Evaluation
  const distinctEdges: Array<{ source: string; target: string }> = [];
  const distinctEdgeSet = new Set<string>();

  for (const key of edgeWeights.keys()) {
    if (metric === "handover") {
      const [s, t] = key.split("-->");
      if (s && t && s !== t && !distinctEdgeSet.has(`${s}->${t}`)) {
        distinctEdgeSet.add(`${s}->${t}`);
        distinctEdges.push({ source: s, target: t });
      }
    } else {
      const [s, t] = key.split("<->");
      if (s && t && s !== t) {
        if (!distinctEdgeSet.has(`${s}->${t}`)) {
          distinctEdgeSet.add(`${s}->${t}`);
          distinctEdges.push({ source: s, target: t });
        }
        if (!distinctEdgeSet.has(`${t}->${s}`)) {
          distinctEdgeSet.add(`${t}->${s}`);
          distinctEdges.push({ source: t, target: s });
        }
      }
    }
  }

  const evaluations = computeSocialEvaluation(allResources, distinctEdges);

  return {
    metric,
    nodes,
    edges,
    evaluations,
    maxEdgeWeight: maxWeight,
    totalInteractions,
  };
}

function computeSocialEvaluation(
  allResources: string[],
  distinctEdges: Array<{ source: string; target: string }>,
): SocialEvaluationRow[] {
  const n = allResources.length;
  if (n === 0) return [];

  const adjOut = new Map<string, string[]>();
  const adjIn = new Map<string, string[]>();

  for (const r of allResources) {
    adjOut.set(r, []);
    adjIn.set(r, []);
  }

  for (const e of distinctEdges) {
    adjOut.get(e.source)?.push(e.target);
    adjIn.get(e.target)?.push(e.source);
  }

  // 1. Betweenness Centrality (Brandes' Algorithm for directed unweighted graph)
  const cb: Record<string, number> = {};
  for (const r of allResources) cb[r] = 0;

  for (const s of allResources) {
    const S: string[] = [];
    const P = new Map<string, string[]>();
    for (const r of allResources) P.set(r, []);
    const sigma: Record<string, number> = {};
    for (const r of allResources) sigma[r] = 0;
    sigma[s] = 1;
    const d: Record<string, number> = {};
    for (const r of allResources) d[r] = -1;
    d[s] = 0;

    const Q: string[] = [s];
    while (Q.length > 0) {
      const v = Q.shift()!;
      S.push(v);
      const neighbors = adjOut.get(v) || [];
      for (const w of neighbors) {
        if (d[w] < 0) {
          Q.push(w);
          d[w] = d[v] + 1;
        }
        if (d[w] === d[v] + 1) {
          sigma[w] += sigma[v];
          P.get(w)!.push(v);
        }
      }
    }

    const delta: Record<string, number> = {};
    for (const r of allResources) delta[r] = 0;

    while (S.length > 0) {
      const w = S.pop()!;
      for (const v of P.get(w) || []) {
        delta[v] += (sigma[v] / (sigma[w] || 1)) * (1 + delta[w]);
      }
      if (w !== s) {
        cb[w] += delta[w];
      }
    }
  }

  // Normalize betweenness by (n-1)(n-2) for directed graph
  const normFactor = n > 2 ? (n - 1) * (n - 2) : 1;

  // 2. Shortest paths for Closeness Centrality
  // Compute all-pairs shortest path distances via BFS
  const distMatrix = new Map<string, Map<string, number>>();
  for (const s of allResources) {
    const distMap = new Map<string, number>();
    for (const t of allResources) distMap.set(t, -1);
    distMap.set(s, 0);

    const Q: string[] = [s];
    while (Q.length > 0) {
      const v = Q.shift()!;
      const dVal = distMap.get(v)!;
      for (const w of adjOut.get(v) || []) {
        if (distMap.get(w)! < 0) {
          distMap.set(w, dVal + 1);
          Q.push(w);
        }
      }
    }
    distMatrix.set(s, distMap);
  }

  return allResources.map((res) => {
    const inDeg = adjIn.get(res)?.length || 0;
    const outDeg = adjOut.get(res)?.length || 0;
    const totalDeg = inDeg + outDeg;

    const normalizedCb = n > 2 ? Math.round((cb[res] / normFactor) * 10000) / 10000 : 0;

    // Out-Closeness: distance from res to other reachable nodes
    let outDistSum = 0;
    let outReachable = 0;
    const resDistOut = distMatrix.get(res);
    for (const other of allResources) {
      if (other !== res) {
        const d = resDistOut?.get(other) ?? -1;
        if (d > 0) {
          outDistSum += d;
          outReachable += 1;
        }
      }
    }
    const outCloseness =
      outDistSum > 0 && n > 1
        ? Math.round((outReachable / (n - 1)) * (outReachable / outDistSum) * 10000) / 10000
        : 0;

    // In-Closeness: distance from other reachable nodes to res
    let inDistSum = 0;
    let inReachable = 0;
    for (const other of allResources) {
      if (other !== res) {
        const d = distMatrix.get(other)?.get(res) ?? -1;
        if (d > 0) {
          inDistSum += d;
          inReachable += 1;
        }
      }
    }
    const inCloseness =
      inDistSum > 0 && n > 1
        ? Math.round((inReachable / (n - 1)) * (inReachable / inDistSum) * 10000) / 10000
        : 0;

    return {
      resource: res,
      inDegree: inDeg,
      outDegree: outDeg,
      totalDegree: totalDeg,
      betweenness: normalizedCb,
      inCloseness,
      outCloseness,
    };
  });
}
