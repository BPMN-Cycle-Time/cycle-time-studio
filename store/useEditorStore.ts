"use client";

import { create } from "zustand";
import { temporal } from "zundo";
import { v4 as uuid } from "uuid";
import { BlockType, BlockMode, type Block, type Branch, type Project, type Task } from "@/types";
import { loadProject, saveProjectData } from "./useProjectsIndex";

export enum SelectionKind {
  BLOCK = "block",
  BRANCH = "branch",
}

interface EditorState {
  project: Project | null;
  selectedId: string | null;
  selectedKind: SelectionKind | null;

  loadProjectById: (id: string) => void;
  setName: (name: string) => void;
  setUnit: (unit: string) => void;

  addBlock: (type: BlockType, afterIndex?: number) => void;
  addNestedBlock: (parentId: string, parentKind: SelectionKind, type: BlockType) => void;
  setBlocks: (blocks: Block[]) => void;
  importBlocksAndTasks: (blocks: Block[], tasks: Task[]) => void;
  updateBlock: (id: string, patch: Partial<Block>) => void;
  removeBlock: (id: string) => void;
  moveBlock: (fromIndex: number, toIndex: number) => void;

  addBranch: (blockId: string) => void;
  updateBranch: (blockId: string, branchId: string, patch: Partial<Branch>) => void;
  removeBranch: (blockId: string, branchId: string) => void;
  toggleBranchMode: (blockId: string, branchId: string) => void;
  toggleLoopMode: (blockId: string) => void;

  addTask: (name: string, time?: number) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  removeTask: (id: string) => void;

  select: (kind: SelectionKind | null, id: string | null) => void;
}

function persistNow(project: Project | null) {
  if (!project) return;
  saveProjectData({ ...project, updatedAt: Date.now() });
}

/** Recursively find and update a block anywhere in the tree (top-level or nested under subBlocks). */
function mapBlocks(blocks: Block[], fn: (b: Block) => Block): Block[] {
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

export const useEditorStore = create<EditorState>()(
  temporal(
    (set, get) => ({
      project: null,
      selectedId: null,
      selectedKind: null,

      loadProjectById: (id) => {
        const project = loadProject(id);
        set({ project, selectedId: null, selectedKind: null });
        useEditorStore.temporal.getState().clear();
      },

      setName: (name) => {
        set((s) => (s.project ? { project: { ...s.project, name } } : s));
        persistNow({ ...(get().project as Project), name });
      },
      setUnit: (unit) => {
        set((s) => (s.project ? { project: { ...s.project, unit } } : s));
        persistNow({ ...(get().project as Project), unit });
      },

      addBlock: (type, afterIndex) => {
        const s = get();
        if (!s.project) return;
        const blocks = [...s.project.blocks];
        const nb: Block = {
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
        const idx = afterIndex === undefined ? blocks.length : afterIndex + 1;
        blocks.splice(idx, 0, nb);
        const project = { ...s.project, blocks };
        set({ project, selectedId: nb.id, selectedKind: SelectionKind.BLOCK });
        persistNow(project);
      },

      addNestedBlock: (parentId, parentKind, type) => {
        const s = get();
        if (!s.project) return;
        const nb: Block = {
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

        const updateBlocksRecursive = (arr: Block[]): Block[] => {
          return arr.map((b) => {
            if (parentKind === SelectionKind.BLOCK && b.id === parentId) {
              return { ...b, mode: BlockMode.COMPOSITE, subBlocks: [...(b.subBlocks ?? []), nb] };
            }
            let nextBranches = b.branches;
            if (b.branches) {
              nextBranches = b.branches.map((br) => {
                if (parentKind === SelectionKind.BRANCH && br.id === parentId) {
                  return {
                    ...br,
                    mode: BlockMode.COMPOSITE,
                    subBlocks: [...(br.subBlocks ?? []), nb],
                  };
                }
                if (br.subBlocks) {
                  return { ...br, subBlocks: updateBlocksRecursive(br.subBlocks) };
                }
                return br;
              });
            }
            let nextSubBlocks = b.subBlocks;
            if (b.subBlocks) {
              nextSubBlocks = updateBlocksRecursive(b.subBlocks);
            }
            return { ...b, branches: nextBranches, subBlocks: nextSubBlocks };
          });
        };

        const blocks = updateBlocksRecursive(s.project.blocks);
        const project = { ...s.project, blocks };
        set({ project, selectedId: nb.id, selectedKind: SelectionKind.BLOCK });
        persistNow(project);
      },

      setBlocks: (blocks) => {
        const s = get();
        if (!s.project) return;
        const project = { ...s.project, blocks };
        set({ project, selectedId: null, selectedKind: null });
        persistNow(project);
      },

      importBlocksAndTasks: (blocks, tasks) => {
        const s = get();
        if (!s.project) return;
        const project = { ...s.project, blocks, tasks };
        set({ project, selectedId: null, selectedKind: null });
        persistNow(project);
      },

      updateBlock: (id, patch) => {
        const s = get();
        if (!s.project) return;
        const blocks = mapBlocks(s.project.blocks, (b) => (b.id === id ? { ...b, ...patch } : b));
        const project = { ...s.project, blocks };
        set({ project });
        persistNow(project);
      },

      removeBlock: (id) => {
        const s = get();
        if (!s.project) return;
        function filterOut(arr: Block[]): Block[] {
          return arr
            .filter((b) => b.id !== id)
            .map((b) => {
              const nextB = { ...b };
              if (nextB.branches) {
                nextB.branches = nextB.branches.map((br) =>
                  br.subBlocks ? { ...br, subBlocks: filterOut(br.subBlocks) } : br,
                );
              }
              if (nextB.subBlocks) {
                nextB.subBlocks = filterOut(nextB.subBlocks);
              }
              return nextB;
            });
        }
        const project = { ...s.project, blocks: filterOut(s.project.blocks) };
        set({ project, selectedId: null, selectedKind: null });
        persistNow(project);
      },

      moveBlock: (fromIndex, toIndex) => {
        const s = get();
        if (!s.project) return;
        const blocks = [...s.project.blocks];
        const [moved] = blocks.splice(fromIndex, 1);
        blocks.splice(toIndex, 0, moved);
        const project = { ...s.project, blocks };
        set({ project });
        persistNow(project);
      },

      addBranch: (blockId) => {
        const s = get();
        if (!s.project) return;
        const blocks = mapBlocks(s.project.blocks, (b) => {
          if (b.id !== blockId || !b.branches) return b;
          const usedP = b.branches.reduce((sum, x) => sum + (x.p ?? 0), 0);
          const nb: Branch = {
            id: uuid(),
            label: `Branch ${String.fromCharCode(65 + b.branches.length)}`,
            p: b.type === BlockType.XOR ? Math.max(0, 100 - usedP) : undefined,
            t: 1,
            mode: BlockMode.SIMPLE,
          };
          return { ...b, branches: [...b.branches, nb] };
        });
        const project = { ...s.project, blocks };
        set({ project });
        persistNow(project);
      },

      updateBranch: (blockId, branchId, patch) => {
        const s = get();
        if (!s.project) return;
        const blocks = mapBlocks(s.project.blocks, (b) => {
          if (!b.branches) return b;
          return {
            ...b,
            branches: b.branches.map((br) => (br.id === branchId ? { ...br, ...patch } : br)),
          };
        });
        const project = { ...s.project, blocks };
        set({ project });
        persistNow(project);
      },

      removeBranch: (blockId, branchId) => {
        const s = get();
        if (!s.project) return;
        const blocks = mapBlocks(s.project.blocks, (b) => {
          if (!b.branches || b.branches.length <= 1) return b;
          return { ...b, branches: b.branches.filter((br) => br.id !== branchId) };
        });
        const project = { ...s.project, blocks };
        set({ project });
        persistNow(project);
      },

      toggleBranchMode: (blockId, branchId) => {
        const s = get();
        if (!s.project) return;
        const mapRecursive = (arr: Block[]): Block[] => {
          return arr.map((b) => {
            let nextBranches = b.branches;
            if (b.branches) {
              nextBranches = b.branches.map((br) => {
                if (br.id !== branchId) {
                  return br.subBlocks ? { ...br, subBlocks: mapRecursive(br.subBlocks) } : br;
                }
                const nextMode =
                  br.mode === BlockMode.COMPOSITE ? BlockMode.SIMPLE : BlockMode.COMPOSITE;
                let nextSubBlocks = br.subBlocks;
                if (
                  nextMode === BlockMode.COMPOSITE &&
                  (!nextSubBlocks || nextSubBlocks.length === 0)
                ) {
                  nextSubBlocks = [
                    {
                      id: uuid(),
                      type: BlockType.SEQ,
                      label: br.label || "Step 1",
                      taskId: br.taskId ?? null,
                      time: br.t ?? 1,
                      mode: BlockMode.SIMPLE,
                    },
                  ];
                }
                return { ...br, mode: nextMode, subBlocks: nextSubBlocks };
              });
            }
            const nextSubBlocks = b.subBlocks ? mapRecursive(b.subBlocks) : b.subBlocks;
            return { ...b, branches: nextBranches, subBlocks: nextSubBlocks };
          });
        };
        const blocks = mapRecursive(s.project.blocks);
        const project = { ...s.project, blocks };
        set({ project });
        persistNow(project);
      },

      toggleLoopMode: (blockId) => {
        const s = get();
        if (!s.project) return;
        const mapRecursive = (arr: Block[]): Block[] => {
          return arr.map((b) => {
            if (b.id === blockId) {
              const nextMode =
                b.mode === BlockMode.COMPOSITE ? BlockMode.SIMPLE : BlockMode.COMPOSITE;
              let nextSubBlocks = b.subBlocks;
              if (
                nextMode === BlockMode.COMPOSITE &&
                (!nextSubBlocks || nextSubBlocks.length === 0)
              ) {
                nextSubBlocks = [
                  {
                    id: uuid(),
                    type: BlockType.SEQ,
                    label: b.label || "Step 1",
                    taskId: b.taskId ?? null,
                    time: b.loopTime ?? 1,
                    mode: BlockMode.SIMPLE,
                  },
                ];
              }
              return { ...b, mode: nextMode, subBlocks: nextSubBlocks };
            }
            let nextBranches = b.branches;
            if (b.branches) {
              nextBranches = b.branches.map((br) =>
                br.subBlocks ? { ...br, subBlocks: mapRecursive(br.subBlocks) } : br,
              );
            }
            const nextSubBlocks = b.subBlocks ? mapRecursive(b.subBlocks) : b.subBlocks;
            return { ...b, branches: nextBranches, subBlocks: nextSubBlocks };
          });
        };
        const blocks = mapRecursive(s.project.blocks);
        const project = { ...s.project, blocks };
        set({ project });
        persistNow(project);
      },

      addTask: (name, time = 1) => {
        const s = get();
        if (!s.project) return;
        const task: Task = { id: uuid(), name, time, usedMinutes: 0 };
        const project = { ...s.project, tasks: [...s.project.tasks, task] };
        set({ project });
        persistNow(project);
      },

      updateTask: (id, patch) => {
        const s = get();
        if (!s.project) return;
        const project = {
          ...s.project,
          tasks: s.project.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        };
        set({ project });
        persistNow(project);
      },

      removeTask: (id) => {
        const s = get();
        if (!s.project) return;
        const clearTaskRefs = (arr: Block[]): Block[] => {
          return arr.map((b) => {
            const nextB = { ...b, taskId: b.taskId === id ? null : b.taskId };
            if (nextB.branches) {
              nextB.branches = nextB.branches.map((br) => ({
                ...br,
                taskId: br.taskId === id ? null : br.taskId,
                subBlocks: br.subBlocks ? clearTaskRefs(br.subBlocks) : br.subBlocks,
              }));
            }
            if (nextB.subBlocks) {
              nextB.subBlocks = clearTaskRefs(nextB.subBlocks);
            }
            return nextB;
          });
        };
        const project = {
          ...s.project,
          tasks: s.project.tasks.filter((t) => t.id !== id),
          blocks: clearTaskRefs(s.project.blocks),
        };
        set({ project });
        persistNow(project);
      },

      select: (kind, id) => set({ selectedKind: kind, selectedId: id }),
    }),
    { limit: 100, partialize: (s) => ({ project: s.project }) },
  ),
);

/** Convenience hooks for undo/redo buttons. */
export function useEditorTemporal() {
  return useEditorStore.temporal.getState();
}
