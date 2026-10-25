// Conformance model inspection: extracts activities, ordering constraints and optionality
// from a Block / Branch process model for footprint-style conformance checking.

import { BlockType, BlockMode, type Block, type Branch, type Task } from "@/types";
import { isEmptyBranch } from "@/utils/blocks";

export interface ModelInspection {
  activities: string[];
  /** Activities that a conformant trace may legitimately omit (e.g. inside an XOR with an empty branch). */
  optionalActivities: Set<string>;
  resourceMap: Map<string, string>; // activityName -> assigned resource
  precedenceGraph: Map<string, Set<string>>; // activity -> set of activities that MUST precede it
  xorAlternatives: Map<string, Set<string>>; // activity -> set of activities in sibling XOR branches
}

interface BlockAnalysis {
  all: Set<string>;
  first: Set<string>;
  last: Set<string>;
  optional: Set<string>;
  /** True when the fragment can complete without executing any activity. */
  canBeEmpty: boolean;
  precedence: Map<string, Set<string>>;
  resources: Map<string, string>;
  xorAlternatives: Map<string, Set<string>>;
}

function emptyAnalysis(canBeEmpty = false): BlockAnalysis {
  return {
    all: new Set(),
    first: new Set(),
    last: new Set(),
    optional: new Set(),
    canBeEmpty,
    precedence: new Map(),
    resources: new Map(),
    xorAlternatives: new Map(),
  };
}

function mergeSetMap(target: Map<string, Set<string>>, source: Map<string, Set<string>>): void {
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

function addPrecedence(
  precedence: Map<string, Set<string>>,
  activity: string,
  predecessor: string,
): void {
  const set = precedence.get(activity) || new Set();
  set.add(predecessor);
  precedence.set(activity, set);
}

/** Merges everything except ordering-specific data (first / last / precedence handled by callers). */
function absorb(result: BlockAnalysis, child: BlockAnalysis): void {
  for (const act of child.all) result.all.add(act);
  for (const act of child.optional) result.optional.add(act);
  mergeSetMap(result.precedence, child.precedence);
  mergeResources(result.resources, child.resources);
  mergeSetMap(result.xorAlternatives, child.xorAlternatives);
}

/**
 * Traverses blocks and tasks to extract activities, ordering constraints, optional activities
 * and XOR alternatives without enumerating valid execution paths (avoids exponential blow-up).
 */
export function inspectModel(blocks: Block[], tasks?: Task[]): ModelInspection {
  const taskMap = new Map<string, Task>();
  if (tasks) {
    for (const t of tasks) taskMap.set(t.id, t);
  }

  const nameOf = (holder: Block | Branch): string => {
    if (holder.taskId && taskMap.has(holder.taskId)) {
      return taskMap.get(holder.taskId)!.name;
    }
    return holder.label || holder.id;
  };

  const resourceOf = (holder: Block | Branch): string | undefined => {
    if (holder.resource?.trim()) return holder.resource.trim();
    if (holder.taskId && taskMap.has(holder.taskId)) {
      const r = taskMap.get(holder.taskId)!.resource;
      if (r?.trim()) return r.trim();
    }
    return undefined;
  };

  function leafAnalysis(name: string, resource: string | undefined): BlockAnalysis {
    const set = new Set([name]);
    return {
      ...emptyAnalysis(),
      all: set,
      first: set,
      last: set,
      resources: resource ? new Map([[name, resource]]) : new Map(),
    };
  }

  function analyzeBranch(br: Branch): BlockAnalysis {
    if (br.mode === BlockMode.COMPOSITE && br.subBlocks && br.subBlocks.length > 0) {
      return analyzeBlocks(br.subBlocks);
    }
    // Empty branch = pure routing path, not an activity.
    if (isEmptyBranch(br)) return emptyAnalysis(true);
    return leafAnalysis(nameOf(br), resourceOf(br));
  }

  function analyzeBlock(b: Block): BlockAnalysis {
    if (b.type === BlockType.LOOP) return analyzeLoop(b);
    if (b.mode === BlockMode.COMPOSITE && b.subBlocks && b.subBlocks.length > 0) {
      return analyzeBlocks(b.subBlocks);
    }
    if (b.type === BlockType.XOR && b.branches && b.branches.length > 0) {
      return analyzeXorBranches(b.branches);
    }
    if (b.type === BlockType.AND && b.branches && b.branches.length > 0) {
      return analyzeAndBranches(b.branches);
    }
    return leafAnalysis(nameOf(b), resourceOf(b));
  }

  function analyzeBlocks(blockList: Block[]): BlockAnalysis {
    const result = emptyAnalysis(true);

    for (const b of blockList) {
      const child = analyzeBlock(b);
      absorb(result, child);

      // Cross-block precedence: every activity seen so far must precede every activity in child
      for (const prev of result.all) {
        if (child.all.has(prev)) continue;
        for (const curr of child.all) {
          addPrecedence(result.precedence, curr, prev);
        }
      }

      // Entry activities: keep collecting while everything before could be skipped.
      if (result.canBeEmpty) for (const act of child.first) result.first.add(act);
      result.last = child.canBeEmpty ? new Set([...result.last, ...child.last]) : child.last;
      result.canBeEmpty = result.canBeEmpty && child.canBeEmpty;
    }

    return result;
  }

  function analyzeXorBranches(branches: Branch[]): BlockAnalysis {
    const result = emptyAnalysis();
    const branchAnalyses = branches.map(analyzeBranch);

    for (const child of branchAnalyses) {
      absorb(result, child);
      for (const act of child.first) result.first.add(act);
      for (const act of child.last) result.last.add(act);
    }

    // A decision with an empty branch may execute nothing: all its activities are optional.
    result.canBeEmpty = branchAnalyses.some((child) => child.canBeEmpty);
    if (result.canBeEmpty) for (const act of result.all) result.optional.add(act);

    // Record XOR alternatives: activities in different branches are alternatives
    for (let i = 0; i < branchAnalyses.length; i++) {
      for (let j = 0; j < branchAnalyses.length; j++) {
        if (i === j) continue;
        for (const act of branchAnalyses[i]!.all) {
          const altSet = result.xorAlternatives.get(act) || new Set();
          for (const alt of branchAnalyses[j]!.all) altSet.add(alt);
          result.xorAlternatives.set(act, altSet);
        }
      }
    }

    return result;
  }

  function analyzeAndBranches(branches: Branch[]): BlockAnalysis {
    const result = emptyAnalysis(true);

    for (const br of branches) {
      const child = analyzeBranch(br);
      absorb(result, child);
      for (const act of child.first) result.first.add(act);
      for (const act of child.last) result.last.add(act);
      result.canBeEmpty = result.canBeEmpty && child.canBeEmpty;
    }

    return result;
  }

  function analyzeLoop(block: Block): BlockAnalysis {
    let body: BlockAnalysis;
    if (block.mode === BlockMode.COMPOSITE && block.subBlocks && block.subBlocks.length > 0) {
      body = analyzeBlocks(block.subBlocks);
    } else if (block.branches && block.branches[0]) {
      body = analyzeBranch(block.branches[0]);
    } else {
      return leafAnalysis(nameOf(block), resourceOf(block));
    }

    // The body may repeat, so a later iteration legitimately runs an activity before an earlier
    // one of the previous iteration (e.g. Bot → Fix → Bot → Lead → Fix). The checker only looks at
    // first occurrences, so internal precedence is dropped. The one rule that holds for every
    // iteration is kept: a single mandatory entry activity comes before the rest of the body.
    // Precedence before loop → loop → after loop is still added by the enclosing sequence.
    const loopResult: BlockAnalysis = { ...body, precedence: new Map() };
    const entry = body.first.size === 1 ? [...body.first][0]! : undefined;
    if (entry && !body.optional.has(entry)) {
      for (const act of body.all) {
        if (act !== entry) addPrecedence(loopResult.precedence, act, entry);
      }
    }
    return loopResult;
  }

  const analysis = analyzeBlocks(blocks);

  return {
    activities: Array.from(analysis.all),
    optionalActivities: analysis.optional,
    resourceMap: analysis.resources,
    precedenceGraph: analysis.precedence,
    xorAlternatives: analysis.xorAlternatives,
  };
}
