import {
  BlockType,
  BlockMode,
  ContributionKind,
  type Block,
  type Branch,
  type ContributionRow,
  type FlowResult,
  type MonteCarloResult,
  type Task,
} from "@/types";

/**
 * Expected-value calculation engine with support for task-linked times and nested sub-processes.
 */

function num(v: unknown): number {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
}

function fmt(n: number): string {
  if (n === Infinity || n === -Infinity) return "∞";
  if (!Number.isFinite(n)) return "0";
  let r = Math.round(n * 100) / 100;
  if (Object.is(r, -0)) r = 0;
  return r.toString();
}

export function getLeafTime(
  holder: { taskId?: string | null; time?: number; t?: number; loopTime?: number },
  rawField: "time" | "t" | "loopTime",
  tasks?: Task[],
): number {
  if (holder.taskId && tasks && tasks.length > 0) {
    const found = tasks.find((t) => t.id === holder.taskId);
    if (found && found.time !== undefined) return num(found.time);
  }
  return num(holder[rawField]);
}

export function sumArray(blocks: Block[] | undefined, tasks?: Task[]): number {
  if (!blocks || blocks.length === 0) return 0;
  return blocks.reduce((s, b) => s + computeBlockTime(b, tasks), 0);
}

export function computeBranchTime(branch: Branch, tasks?: Task[]): number {
  if (branch.mode === BlockMode.COMPOSITE) return sumArray(branch.subBlocks, tasks);
  return getLeafTime(branch, "t", tasks);
}

export function computeBlockTime(block: Block, tasks?: Task[]): number {
  switch (block.type) {
    case BlockType.SEQ: {
      if (block.mode === BlockMode.COMPOSITE) return sumArray(block.subBlocks, tasks);
      return getLeafTime(block, "time", tasks);
    }
    case BlockType.XOR: {
      const branches = block.branches ?? [];
      if (branches.length === 0) return 0;
      const totalP = branches.reduce((s, b) => s + num(b.p), 0);
      const denom = totalP > 0 ? totalP : 100;
      return branches.reduce((s, b) => s + (num(b.p) / denom) * computeBranchTime(b, tasks), 0);
    }
    case BlockType.AND: {
      const branches = block.branches ?? [];
      if (branches.length === 0) return 0;
      return Math.max(...branches.map((b) => computeBranchTime(b, tasks)));
    }
    case BlockType.LOOP: {
      const rawR = num(block.loopP);
      const r = rawR / 100;
      if (r >= 1) return Infinity;
      const base =
        block.mode === BlockMode.COMPOSITE
          ? sumArray(block.subBlocks, tasks)
          : getLeafTime(block, "loopTime", tasks);
      return base / (1 - r);
    }
    default:
      return 0;
  }
}

export interface CostBreakdown {
  total: number;
  labor: number;
  fixed: number;
}

export function getLeafCost(
  holder: {
    taskId?: string | null;
    time?: number;
    t?: number;
    loopTime?: number;
    hourlyRate?: number;
    fixedCost?: number;
    cost?: number;
    loopCost?: number;
  },
  tasks?: Task[],
): CostBreakdown {
  if (holder.taskId && tasks && tasks.length > 0) {
    const found = tasks.find((t) => t.id === holder.taskId);
    if (found) {
      const time = num(found.time);
      const rate = num(found.hourlyRate);
      const fixed = num(found.fixedCost);
      const labor = time * rate;
      return { total: labor + fixed, labor, fixed };
    }
  }
  const time = num(holder.time ?? holder.t ?? holder.loopTime);
  const rate = num(holder.hourlyRate);
  const fixed = num(holder.fixedCost ?? holder.cost ?? holder.loopCost);
  const labor = time * rate;
  return { total: labor + fixed, labor, fixed };
}

export function sumArrayCost(blocks: Block[] | undefined, tasks?: Task[]): CostBreakdown {
  if (!blocks || blocks.length === 0) return { total: 0, labor: 0, fixed: 0 };
  return blocks.reduce(
    (acc, b) => {
      const res = computeBlockCost(b, tasks);
      return {
        total: acc.total + res.total,
        labor: acc.labor + res.labor,
        fixed: acc.fixed + res.fixed,
      };
    },
    { total: 0, labor: 0, fixed: 0 },
  );
}

export function computeBranchCost(branch: Branch, tasks?: Task[]): CostBreakdown {
  if (branch.mode === BlockMode.COMPOSITE) return sumArrayCost(branch.subBlocks, tasks);
  return getLeafCost(branch, tasks);
}

export function computeBlockCost(block: Block, tasks?: Task[]): CostBreakdown {
  switch (block.type) {
    case BlockType.SEQ: {
      if (block.mode === BlockMode.COMPOSITE) return sumArrayCost(block.subBlocks, tasks);
      return getLeafCost(block, tasks);
    }
    case BlockType.XOR: {
      const branches = block.branches ?? [];
      if (branches.length === 0) return { total: 0, labor: 0, fixed: 0 };
      const totalP = branches.reduce((s, b) => s + num(b.p), 0);
      const denom = totalP > 0 ? totalP : 100;
      return branches.reduce(
        (acc, b) => {
          const brCost = computeBranchCost(b, tasks);
          const weight = num(b.p) / denom;
          return {
            total: acc.total + brCost.total * weight,
            labor: acc.labor + brCost.labor * weight,
            fixed: acc.fixed + brCost.fixed * weight,
          };
        },
        { total: 0, labor: 0, fixed: 0 },
      );
    }
    case BlockType.AND: {
      const branches = block.branches ?? [];
      if (branches.length === 0) return { total: 0, labor: 0, fixed: 0 };
      return branches.reduce(
        (acc, b) => {
          const brCost = computeBranchCost(b, tasks);
          return {
            total: acc.total + brCost.total,
            labor: acc.labor + brCost.labor,
            fixed: acc.fixed + brCost.fixed,
          };
        },
        { total: 0, labor: 0, fixed: 0 },
      );
    }
    case BlockType.LOOP: {
      const rawR = num(block.loopP);
      const r = rawR / 100;
      if (r >= 1) return { total: Infinity, labor: Infinity, fixed: Infinity };
      const mult = 1 / (1 - r);
      const base =
        block.mode === BlockMode.COMPOSITE
          ? sumArrayCost(block.subBlocks, tasks)
          : getLeafCost(block, tasks);
      return {
        total: base.total * mult,
        labor: base.labor * mult,
        fixed: base.fixed * mult,
      };
    }
    default:
      return { total: 0, labor: 0, fixed: 0 };
  }
}

export interface BlockComputationResult {
  value: number;
  formula: string;
  warning?: string;
  invalid?: boolean;
  branchValues?: number[];
  bodyValue?: number;
}

export function computeBlockDetails(block: Block, tasks?: Task[]): BlockComputationResult {
  switch (block.type) {
    case BlockType.SEQ: {
      const t = getLeafTime(block, "time", tasks);
      return {
        value: t,
        formula: `CT = T = ${fmt(t)}`,
        warning: "",
        invalid: false,
      };
    }
    case BlockType.AND: {
      const branches = block.branches ?? [];
      const branchValues = branches.map((b) => computeBranchTime(b, tasks));
      const value = branchValues.length ? Math.max(...branchValues) : 0;
      const terms = branchValues.map(fmt).join(", ");
      return {
        value,
        formula: `CT = Max(${terms || "0"}) = ${fmt(value)}`,
        warning: "",
        invalid: false,
        branchValues,
      };
    }
    case BlockType.XOR: {
      const branches = block.branches ?? [];
      const sumP = branches.reduce((s, b) => s + num(b.p), 0);
      const branchValues = branches.map((b) => computeBranchTime(b, tasks));
      const value = branches.reduce((s, br, i) => s + (num(br.p) / 100) * branchValues[i], 0);
      const terms = branches
        .map((br, i) => `${(num(br.p) / 100).toFixed(2)}×${fmt(branchValues[i])}`)
        .join(" + ");
      const warning =
        Math.abs(sumP - 100) > 0.5
          ? `Branch probabilities total ${fmt(sumP)}% — they should add up to 100%`
          : "";
      return {
        value,
        formula: `CT = Σ(pᵢ×Tᵢ) = ${terms || "0"} = ${fmt(value)}`,
        warning,
        invalid: false,
        branchValues,
      };
    }
    case BlockType.LOOP: {
      const body =
        block.mode === BlockMode.COMPOSITE
          ? sumArray(block.subBlocks, tasks)
          : getLeafTime(block, "loopTime", tasks);
      const r = num(block.loopP) / 100;
      const invalid = r >= 1;
      const value = invalid ? Infinity : body / (1 - r);
      const warning = invalid
        ? "Rework probability must stay below 100%, or the loop never converges"
        : "";
      return {
        value,
        formula: `CT = T/(1−r) = ${fmt(body)}/(1−${r.toFixed(2)}) = ${invalid ? "∞" : fmt(value)}`,
        warning,
        invalid,
        bodyValue: body,
      };
    }
    default:
      return { value: 0, formula: "", warning: "", invalid: false };
  }
}

/** Flattens the block tree into a total + a per-node contribution breakdown, for the chart/inspector. */
export function computeFlow(blocks: Block[], tasks?: Task[]): FlowResult {
  const contributions: ContributionRow[] = [];

  function visitArray(arr: Block[], depth: number, scale: number) {
    for (const b of arr) visitBlock(b, depth, scale);
  }

  function visitBlock(b: Block, depth: number, scale: number) {
    const own = computeBlockTime(b, tasks) * scale;
    const ownCost = computeBlockCost(b, tasks);
    contributions.push({
      id: b.id,
      label: b.label,
      expected: Number.isFinite(own) ? own : 0,
      expectedCost: Number.isFinite(ownCost.total * scale) ? ownCost.total * scale : 0,
      share: 0,
      depth,
      kind: ContributionKind.BLOCK,
    });

    if (b.type === BlockType.XOR && b.branches) {
      const totalP = b.branches.reduce((s, x) => s + num(x.p), 0) || 100;
      for (const br of b.branches) {
        const mult = num(br.p) / totalP;
        const branchTime = computeBranchTime(br, tasks);
        const branchCost = computeBranchCost(br, tasks);
        contributions.push({
          id: br.id,
          label: br.label,
          expected: Number.isFinite(branchTime * mult * scale) ? branchTime * mult * scale : 0,
          expectedCost: Number.isFinite(branchCost.total * mult * scale)
            ? branchCost.total * mult * scale
            : 0,
          share: 0,
          depth: depth + 1,
          kind: ContributionKind.BRANCH,
          multiplier: mult,
        });
        if (br.mode === BlockMode.COMPOSITE && br.subBlocks)
          visitArray(br.subBlocks, depth + 2, scale * mult);
      }
    } else if (b.type === BlockType.AND && b.branches) {
      const times = b.branches.map((br) => computeBranchTime(br, tasks));
      const maxT = Math.max(0, ...times);
      b.branches.forEach((br, i) => {
        const isCritical = times[i] === maxT;
        const branchCost = computeBranchCost(br, tasks);
        contributions.push({
          id: br.id,
          label: br.label,
          expected: Number.isFinite(times[i] * scale) ? times[i] * scale : 0,
          expectedCost: Number.isFinite(branchCost.total * scale) ? branchCost.total * scale : 0,
          share: 0,
          depth: depth + 1,
          kind: ContributionKind.BRANCH,
          excluded: !isCritical,
        });
        if (br.mode === BlockMode.COMPOSITE && br.subBlocks)
          visitArray(br.subBlocks, depth + 2, isCritical ? scale : 0);
      });
    } else if (b.mode === BlockMode.COMPOSITE && b.subBlocks) {
      visitArray(b.subBlocks, depth + 1, scale);
    }
  }

  visitArray(blocks, 0, 1);
  const total = sumArray(blocks, tasks);
  const cost = sumArrayCost(blocks, tasks);
  for (const row of contributions) row.share = total > 0 ? row.expected / total : 0;
  return {
    total,
    totalCost: cost.total,
    laborCost: cost.labor,
    fixedCost: cost.fixed,
    contributions,
  };
}

function sampleBlock(b: Block, tasks?: Task[]): number {
  switch (b.type) {
    case BlockType.SEQ:
      return b.mode === BlockMode.COMPOSITE
        ? sampleArray(b.subBlocks, tasks)
        : getLeafTime(b, "time", tasks);
    case BlockType.XOR: {
      const branches = b.branches ?? [];
      const totalP = branches.reduce((s, x) => s + num(x.p), 0) || 100;
      const roll = Math.random() * totalP;
      let acc = 0;
      for (const br of branches) {
        acc += num(br.p);
        if (roll <= acc)
          return br.mode === BlockMode.COMPOSITE
            ? sampleArray(br.subBlocks, tasks)
            : getLeafTime(br, "t", tasks);
      }
      return 0;
    }
    case BlockType.AND: {
      const branches = b.branches ?? [];
      if (branches.length === 0) return 0;
      return Math.max(
        ...branches.map((br) =>
          br.mode === BlockMode.COMPOSITE
            ? sampleArray(br.subBlocks, tasks)
            : getLeafTime(br, "t", tasks),
        ),
      );
    }
    case BlockType.LOOP: {
      const p = Math.min(0.98, Math.max(0, num(b.loopP) / 100));
      const base =
        b.mode === BlockMode.COMPOSITE
          ? sampleArray(b.subBlocks, tasks)
          : getLeafTime(b, "loopTime", tasks);
      let total = 0;
      let iterations = 0;
      do {
        total += base;
        iterations++;
      } while (Math.random() < p && iterations < 500);
      return total;
    }
    default:
      return 0;
  }
}

function sampleArray(blocks: Block[] | undefined, tasks?: Task[]): number {
  if (!blocks || blocks.length === 0) return 0;
  return blocks.reduce((s, b) => s + sampleBlock(b, tasks), 0);
}

export function runMonteCarlo(
  blocks: Block[],
  iterations = 5000,
  buckets = 24,
  tasks?: Task[],
): MonteCarloResult {
  const samples: number[] = new Array(iterations);
  for (let i = 0; i < iterations; i++) samples[i] = sampleArray(blocks, tasks);
  samples.sort((a, b) => a - b);

  const pct = (p: number) =>
    samples[Math.min(samples.length - 1, Math.floor((p / 100) * samples.length))];
  const mean = samples.reduce((s, v) => s + v, 0) / (samples.length || 1);
  const min = samples[0] ?? 0;
  const max = samples[samples.length - 1] ?? 0;

  const histogram: MonteCarloResult["histogram"] = [];
  const span = Math.max(1e-9, max - min);
  const step = span / buckets;
  for (let i = 0; i < buckets; i++) {
    const x0 = min + i * step;
    const x1 = i === buckets - 1 ? max : min + (i + 1) * step;
    histogram.push({ x0, x1, count: 0 });
  }
  for (const s of samples) {
    const idx = Math.min(buckets - 1, Math.floor(((s - min) / span) * buckets));
    histogram[idx].count++;
  }

  return { samples, mean, p50: pct(50), p85: pct(85), p95: pct(95), min, max, histogram };
}
