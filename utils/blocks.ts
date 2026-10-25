import type { Block, Branch } from "@/types";

export function countBlocks(blocks: Block[]): number {
  let count = 0;

  function visit(b: Block) {
    count += 1;
    if (b.subBlocks && b.subBlocks.length > 0) {
      b.subBlocks.forEach(visit);
    }
    if (b.branches && b.branches.length > 0) {
      b.branches.forEach((br) => {
        if (br.subBlocks && br.subBlocks.length > 0) {
          br.subBlocks.forEach(visit);
        }
      });
    }
  }

  blocks.forEach(visit);
  return count;
}

/**
 * An empty branch is a pure routing path (e.g. the "Yes" side of a decision that goes
 * straight to the join): no task, no sub-blocks and no direct time. It is not an activity —
 * it renders as a bare sequence flow and contributes 0 time / cost.
 */
export function isEmptyBranch(branch: Branch): boolean {
  return !branch.taskId && !branch.subBlocks?.length && !branch.t;
}
