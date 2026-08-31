import { create } from "zustand";
import { temporal } from "zundo";
import type { Block, Branch, Project, Task } from "@/types";
import { BlockMode, BlockType } from "@/types";
import { loadProject } from "./useProjectsIndex";
import {
  persistNow,
  mapBlocks,
  filterBlocksTree,
  insertRelativeInTree,
  createNewBlock,
} from "./editor-helpers";

export enum SelectionKind {
  BLOCK = "block",
  BRANCH = "branch",
  TASK = "task",
}

export interface EditorState {
  project: Project | null;
  selectedId: string | null;
  selectedKind: SelectionKind | null;

  loadProjectById: (id: string) => void;
  setName: (name: string) => void;
  setUnit: (unit: string) => void;

  addBlock: (type: BlockType, afterIndex?: number) => void;
  insertBlockRelative: (targetId: string, pos: "before" | "after", type?: BlockType) => void;
  addNestedBlock: (parentId: string, parentKind: SelectionKind, type: BlockType) => void;
  setBlocks: (blocks: Block[]) => void;
  setBpmnXml: (bpmnXml: string) => void;
  importBlocksAndTasks: (blocks: Block[], tasks: Task[], bpmnXml?: string) => void;
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
        const nb = createNewBlock(type);
        const idx = afterIndex === undefined ? blocks.length : afterIndex + 1;
        blocks.splice(idx, 0, nb);
        const project = { ...s.project, blocks };
        set({ project, selectedId: nb.id, selectedKind: SelectionKind.BLOCK });
        persistNow(project);
      },

      insertBlockRelative: (targetId, pos, type = BlockType.SEQ) => {
        const s = get();
        if (!s.project) return;
        const nb = createNewBlock(type);
        const res = insertRelativeInTree(s.project.blocks, targetId, pos, nb);
        const blocks = res.found ? res.list : [...s.project.blocks, nb];
        const project = { ...s.project, blocks };
        set({ project, selectedId: nb.id, selectedKind: SelectionKind.BLOCK });
        persistNow(project);
      },

      addNestedBlock: (parentId, parentKind, type) => {
        const s = get();
        if (!s.project) return;
        const nb = createNewBlock(type);

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

      setBpmnXml: (bpmnXml) => {
        const s = get();
        if (!s.project) return;
        const project = { ...s.project, bpmnXml };
        set({ project });
        persistNow(project);
      },

      importBlocksAndTasks: (blocks, tasks, bpmnXml) => {
        const s = get();
        if (!s.project) return;
        const project = { ...s.project, blocks, tasks, ...(bpmnXml ? { bpmnXml } : {}) };
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
        const project = { ...s.project, blocks: filterBlocksTree(s.project.blocks, id) };
        set({ project, selectedId: null, selectedKind: null });
        persistNow(project);
      },

      moveBlock: (fromIndex, toIndex) => {
        const s = get();
        if (!s.project) return;
        const blocks = [...s.project.blocks];
        const [moved] = blocks.splice(fromIndex, 1);
        if (moved) {
          blocks.splice(toIndex, 0, moved);
        }
        const project = { ...s.project, blocks };
        set({ project });
        persistNow(project);
      },

      addBranch: (blockId) => {
        const s = get();
        if (!s.project) return;
        const newBranch: Branch = {
          id: createNewBlock(BlockType.SEQ).id,
          label: "New Branch",
          t: 1,
          p: 0,
          mode: BlockMode.SIMPLE,
        };
        const blocks = mapBlocks(s.project.blocks, (b) => {
          if (b.id !== blockId) return b;
          return {
            ...b,
            branches: [...(b.branches ?? []), newBranch],
          };
        });
        const project = { ...s.project, blocks };
        set({ project, selectedId: newBranch.id, selectedKind: SelectionKind.BRANCH });
        persistNow(project);
      },

      updateBranch: (blockId, branchId, patch) => {
        const s = get();
        if (!s.project) return;
        const blocks = mapBlocks(s.project.blocks, (b) => {
          if (b.id !== blockId || !b.branches) return b;
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
          if (b.id !== blockId || !b.branches) return b;
          return {
            ...b,
            branches: b.branches.filter((br) => br.id !== branchId),
          };
        });
        const project = { ...s.project, blocks };
        set({ project, selectedId: null, selectedKind: null });
        persistNow(project);
      },

      toggleBranchMode: (blockId, branchId) => {
        const s = get();
        if (!s.project) return;
        const blocks = mapBlocks(s.project.blocks, (b) => {
          if (b.id !== blockId || !b.branches) return b;
          return {
            ...b,
            branches: b.branches.map((br) => {
              if (br.id !== branchId) return br;
              const nextMode =
                br.mode === BlockMode.COMPOSITE ? BlockMode.SIMPLE : BlockMode.COMPOSITE;
              const subBlocks =
                nextMode === BlockMode.COMPOSITE
                  ? br.subBlocks && br.subBlocks.length > 0
                    ? br.subBlocks
                    : [
                        {
                          id: createNewBlock(BlockType.SEQ).id,
                          type: BlockType.SEQ,
                          label: "Step 1",
                          mode: BlockMode.SIMPLE,
                          time: br.t ?? 1,
                        },
                      ]
                  : br.subBlocks;
              return { ...br, mode: nextMode, subBlocks };
            }),
          };
        });
        const project = { ...s.project, blocks };
        set({ project });
        persistNow(project);
      },

      toggleLoopMode: (blockId) => {
        const s = get();
        if (!s.project) return;
        const blocks = mapBlocks(s.project.blocks, (b) => {
          if (b.id !== blockId) return b;
          const nextMode = b.mode === BlockMode.COMPOSITE ? BlockMode.SIMPLE : BlockMode.COMPOSITE;
          const subBlocks =
            nextMode === BlockMode.COMPOSITE
              ? b.subBlocks && b.subBlocks.length > 0
                ? b.subBlocks
                : [
                    {
                      id: createNewBlock(BlockType.SEQ).id,
                      type: BlockType.SEQ,
                      label: "Loop step 1",
                      mode: BlockMode.SIMPLE,
                      time: b.loopTime ?? 1,
                    },
                  ]
              : b.subBlocks;
          return { ...b, mode: nextMode, subBlocks };
        });
        const project = { ...s.project, blocks };
        set({ project });
        persistNow(project);
      },

      addTask: (name, time = 1) => {
        const s = get();
        if (!s.project) return;
        const nt: Task = {
          id: createNewBlock(BlockType.SEQ).id,
          name: name.trim() || "New Task",
          time,
        };
        const tasks = [...(s.project.tasks ?? []), nt];
        const project = { ...s.project, tasks };
        set({ project, selectedId: nt.id, selectedKind: SelectionKind.TASK });
        persistNow(project);
      },

      updateTask: (id, patch) => {
        const s = get();
        if (!s.project || !s.project.tasks) return;
        const tasks = s.project.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t));
        const project = { ...s.project, tasks };
        set({ project });
        persistNow(project);
      },

      removeTask: (id) => {
        const s = get();
        if (!s.project || !s.project.tasks) return;
        const tasks = s.project.tasks.filter((t) => t.id !== id);
        const project = { ...s.project, tasks };
        set({ project, selectedId: null, selectedKind: null });
        persistNow(project);
      },

      select: (kind, id) => {
        set({ selectedKind: kind, selectedId: id });
      },
    }),
    {
      limit: 50,
      equality: (pastState, currentState) =>
        JSON.stringify(pastState.project) === JSON.stringify(currentState.project),
    },
  ),
);
