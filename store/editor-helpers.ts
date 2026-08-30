import type { Block, Project } from "@/types";
import { BlockMode, BlockType } from "@/types";
import { saveProjectData } from "./useProjectsIndex";
import { v4 as uuid } from "uuid";

export function persistNow(project: Project | null) {
  if (!project) return;
  saveProjectData({ ...project, updatedAt: Date.now() });
}

/** Recursively find and update a block anywhere in the tree (top-level or nested under subBlocks). */
export function mapBlocks(blocks: Block[], fn: (b: Block) => Block): Block[] {
  return blocks.map((b) => {
    let next = fn(b);
    if (next.branches) {
      next = {
        ...next,
        branches: next.branches.map((br) =>
          br.subBlocks ? { ...br, subBlocks: mapBlocks(br.subBlocks, fn) } : br,
        ),
      };
    }
    if (next.subBlocks) {
      next = { ...next, subBlocks: mapBlocks(next.subBlocks, fn) };
    }
    return next;
  });
}

/** Recursively remove a block from the tree by id. */
export function filterBlocksTree(arr: Block[], removeId: string): Block[] {
  return arr
    .filter((b) => b.id !== removeId)
    .map((b) => {
      const nextB = { ...b };
      if (nextB.branches) {
        nextB.branches = nextB.branches.map((br) =>
          br.subBlocks ? { ...br, subBlocks: filterBlocksTree(br.subBlocks, removeId) } : br,
        );
      }
      if (nextB.subBlocks) {
        nextB.subBlocks = filterBlocksTree(nextB.subBlocks, removeId);
      }
      return nextB;
    });
}

/** Recursively insert a new block before/after a target block id anywhere in the tree. */
export function insertRelativeInTree(
  list: Block[],
  targetId: string,
  pos: "before" | "after",
  nb: Block,
): { found: boolean; list: Block[] } {
  const idx = list.findIndex((b) => b.id === targetId);
  if (idx !== -1) {
    const nextList = [...list];
    const insertIdx = pos === "before" ? idx : idx + 1;
    nextList.splice(insertIdx, 0, nb);
    return { found: true, list: nextList };
  }

  let found = false;
  const nextList = list.map((b) => {
    if (found) return b;
    let nextBranches = b.branches;
    let nextSubBlocks = b.subBlocks;

    if (b.branches) {
      nextBranches = b.branches.map((br) => {
        if (found) return br;
        if (br.subBlocks) {
          const res = insertRelativeInTree(br.subBlocks, targetId, pos, nb);
          if (res.found) {
            found = true;
            return { ...br, subBlocks: res.list };
          }
        }
        return br;
      });
    }

    if (!found && b.subBlocks) {
      const res = insertRelativeInTree(b.subBlocks, targetId, pos, nb);
      if (res.found) {
        found = true;
        nextSubBlocks = res.list;
      }
    }

    return { ...b, branches: nextBranches, subBlocks: nextSubBlocks };
  });

  return { found, list: nextList };
}

export function createNewBlock(type: BlockType): Block {
  return {
    id: uuid(),
    type,
    label:
      type === BlockType.SEQ
        ? "New step"
        : type === BlockType.XOR
          ? "Decision"
          : type === BlockType.AND
            ? "Parallel work"
            : "Rework loop",
    mode: BlockMode.SIMPLE,
    time: type === BlockType.SEQ ? 1 : undefined,
    loopP: type === BlockType.LOOP ? 20 : undefined,
    loopTime: type === BlockType.LOOP ? 1 : undefined,
    branches:
      type === BlockType.XOR || type === BlockType.AND
        ? [
            {
              id: uuid(),
              label: "Branch A",
              p: type === BlockType.XOR ? 50 : undefined,
              t: 1,
              mode: BlockMode.SIMPLE,
            },
            {
              id: uuid(),
              label: "Branch B",
              p: type === BlockType.XOR ? 50 : undefined,
              t: 1,
              mode: BlockMode.SIMPLE,
            },
          ]
        : undefined,
  };
}
