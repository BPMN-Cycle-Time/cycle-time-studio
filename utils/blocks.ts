import type { Block } from "@/types";

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
