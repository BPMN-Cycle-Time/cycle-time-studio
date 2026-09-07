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
      availableThresholds: [1],
      thresholdEdgeCounts: { 1: 0 },
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
    // Working Together: co-occurrence of resources in the same case with step-distance decay (beta^(d-1))
    // van der Aalst, Reijers & Song (2005): resources executing adjacent/close tasks have higher collaboration strength.
    const pairDecayWeights = new Map<string, number>();

    for (const caseEvents of traces.values()) {
      const sorted = [...caseEvents].sort(
        (a, b) => new Date(a.startTimestamp).getTime() - new Date(b.startTimestamp).getTime(),
      );

      // Collect step indices for each resource in this trace
      const resourceIndices = new Map<string, number[]>();
      for (let idx = 0; idx < sorted.length; idx++) {
        const res = sorted[idx].resource;
        const list = resourceIndices.get(res) || [];
        list.push(idx);
        resourceIndices.set(res, list);
      }

      const caseResources = Array.from(resourceIndices.keys());
      for (let i = 0; i < caseResources.length; i++) {
        for (let j = i + 1; j < caseResources.length; j++) {
          const rA = caseResources[i];
          const rB = caseResources[j];
          const [source, target] = [rA, rB].sort();
          const key = `${source}<->${target}`;

          // Find minimum step distance d between rA and rB in this trace (d >= 1)
          const indicesA = resourceIndices.get(rA) || [];
          const indicesB = resourceIndices.get(rB) || [];
          let minDistance = Infinity;

          for (const posA of indicesA) {
            for (const posB of indicesB) {
              const d = Math.abs(posA - posB);
              if (d < minDistance) {
                minDistance = d;
              }
            }
          }

          if (minDistance !== Infinity && minDistance >= 1) {
            // Step decay beta^(d-1) with beta = 0.6
            const decay = Math.pow(0.6, minDistance - 1);
            pairDecayWeights.set(key, (pairDecayWeights.get(key) || 0) + decay);
          }
        }
      }
    }

    // Convert accumulated decay weights to clean integers
    for (const [key, rawWeight] of pairDecayWeights.entries()) {
      const weight = Math.max(1, Math.round(rawWeight));
      edgeWeights.set(key, weight);

      const [source, target] = key.split("<->");
      workingTogetherCounts[source] = (workingTogetherCounts[source] || 0) + weight;
      workingTogetherCounts[target] = (workingTogetherCounts[target] || 0) + weight;
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

  // 4. Build Distinct Edges for Graph Topology & Centrality Evaluation (using filtered edges)
  const distinctEdges: Array<{ source: string; target: string }> = [];
  const distinctEdgeSet = new Set<string>();

  for (const edge of edges) {
    const s = edge.source;
    const t = edge.target;
    if (s && t && s !== t) {
      if (!distinctEdgeSet.has(`${s}->${t}`)) {
        distinctEdgeSet.add(`${s}->${t}`);
        distinctEdges.push({ source: s, target: t });
      }
      if (metric !== "handover" && !distinctEdgeSet.has(`${t}->${s}`)) {
        distinctEdgeSet.add(`${t}->${s}`);
        distinctEdges.push({ source: t, target: s });
      }
    }
  }

  const evaluations = computeSocialEvaluation(allResources, distinctEdges);

  // 5. Dynamic Thresholds based on real edge weight distribution
  const allWeights = Array.from(edgeWeights.values()).filter((w) => w > 0);
  let availableThresholds: number[] = [1];
  const thresholdEdgeCounts: Record<number, number> = {};

  if (allWeights.length > 0) {
    const uniqueSorted = Array.from(new Set(allWeights)).sort((a, b) => a - b);
    if (uniqueSorted.length <= 4) {
      availableThresholds = Array.from(new Set([1, ...uniqueSorted]));
    } else {
      const step1 = 1;
      const step2 = uniqueSorted[Math.floor(uniqueSorted.length * 0.33)];
      const step3 = uniqueSorted[Math.floor(uniqueSorted.length * 0.67)];
      const step4 = uniqueSorted[uniqueSorted.length - 1];
      availableThresholds = Array.from(new Set([step1, step2, step3, step4])).sort((a, b) => a - b);
    }
  }

  for (const th of availableThresholds) {
    thresholdEdgeCounts[th] = allWeights.filter((w) => w >= th).length;
  }

  return {
    metric,
    nodes,
    edges,
    evaluations,
    maxEdgeWeight: maxWeight,
    totalInteractions,
    availableThresholds,
    thresholdEdgeCounts,
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
