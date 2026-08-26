import type { Block, Branch } from "@/types";

export function findBlockInTree(
  blocks: Block[],
  id: string,
): { block: Block; parentList: Block[]; index: number } | null {
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]!;
    if (b.id === id) return { block: b, parentList: blocks, index: i };
    if (b.subBlocks) {
      const found = findBlockInTree(b.subBlocks, id);
      if (found) return found;
    }
    if (b.branches) {
      for (const br of b.branches) {
        if (br.subBlocks) {
          const found = findBlockInTree(br.subBlocks, id);
          if (found) return found;
        }
      }
    }
  }
  return null;
}

export function findBranchInTree(
  blocks: Block[],
  id: string,
): { branch: Branch; parentBlock: Block } | null {
  for (const b of blocks) {
    if (b.branches) {
      for (const br of b.branches) {
        if (br.id === id) return { branch: br, parentBlock: b };
        if (br.subBlocks) {
          const found = findBranchInTree(br.subBlocks, id);
          if (found) return found;
        }
      }
    }
    if (b.subBlocks) {
      const found = findBranchInTree(b.subBlocks, id);
      if (found) return found;
    }
  }
  return null;
}
