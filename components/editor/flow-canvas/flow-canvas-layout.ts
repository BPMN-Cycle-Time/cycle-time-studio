import { BlockType, BlockMode, type Block, type Branch, type Task } from "@/types";
import type { Edge } from "@xyflow/react";
import type { FlowCanvasNodeType } from "./flow-canvas-node";
import type { FlowCanvasBranchNodeType } from "./flow-canvas-branch-node";

export type FlowAnyNodeType = FlowCanvasNodeType | FlowCanvasBranchNodeType;

export interface FlowLayoutLabels {
  subProcess?: string;
  loopBody?: string;
  branch?: string;
  repeat?: (p: number) => string;
}

export interface BuildFlowParams {
  blocks: Block[];
  tasks: Task[];
  unit: string;
  currency: string;
  selectedId: string | null;
  userPositions: Record<string, { x: number; y: number }>;
  labels?: FlowLayoutLabels;
  onUpdateBlock: (id: string, patch: Partial<Block>) => void;
  onRemoveBlock: (id: string) => void;
  onDuplicateBlock: (block: Block) => void;
  onUpdateBranch: (blockId: string, branchId: string, patch: Partial<Branch>) => void;
  onRemoveBranch: (blockId: string, branchId: string) => void;
  onSelect: (id: string) => void;
}

export interface FlowLayoutResult {
  nodes: FlowAnyNodeType[];
  edges: Edge[];
  defaultPositions: Record<string, { x: number; y: number }>;
}

const HORIZONTAL_STEP = 420;
const VERTICAL_STEP = 320;

export function buildFlowElements(params: BuildFlowParams): FlowLayoutResult {
  const {
    blocks,
    tasks,
    unit,
    currency,
    selectedId,
    userPositions,
    labels,
    onUpdateBlock,
    onRemoveBlock,
    onDuplicateBlock,
    onUpdateBranch,
    onRemoveBranch,
    onSelect,
  } = params;

  const nodes: FlowAnyNodeType[] = [];
  const edges: Edge[] = [];
  const defaultPositions: Record<string, { x: number; y: number }> = {};
  let globalIndex = 0;

  function traverseBlocks(
    blockList: Block[],
    startX: number,
    startY: number,
    parentContext?: string,
  ): { entryId: string | null; exitIds: string[]; endX: number } {
    let cursorX = startX;
    let prevExits: string[] = [];
    let firstEntryId: string | null = null;

    for (const b of blockList) {
      let currentEntry: string | null = null;
      let currentExits: string[] = [];

      if (b.type === BlockType.SEQ) {
        if (b.mode === BlockMode.COMPOSITE && b.subBlocks?.length) {
          const subResult = traverseBlocks(
            b.subBlocks,
            cursorX,
            startY,
            b.label || labels?.subProcess || "Sub-process",
          );
          currentEntry = subResult.entryId;
          currentExits = subResult.exitIds;
          cursorX = subResult.endX;
        } else {
          defaultPositions[b.id] = { x: cursorX, y: startY };
          const pos = userPositions[b.id] || defaultPositions[b.id];

          nodes.push({
            id: b.id,
            type: "flowBlock",
            position: pos,
            data: {
              block: b,
              index: globalIndex++,
              unit,
              currency,
              tasks,
              isSelected: selectedId === b.id,
              parentContext,
              onUpdateBlock,
              onRemoveBlock,
              onDuplicateBlock,
              onSelect,
            },
          });

          currentEntry = b.id;
          currentExits = [b.id];
          cursorX += HORIZONTAL_STEP;
        }
      } else if (b.type === BlockType.LOOP) {
        const repeatText = labels?.repeat
          ? labels.repeat(b.loopP ?? 20)
          : `Repeat ${b.loopP ?? 20}%`;

        if (b.mode === BlockMode.COMPOSITE && b.subBlocks?.length) {
          const subResult = traverseBlocks(
            b.subBlocks,
            cursorX,
            startY,
            b.label || labels?.loopBody || "Loop Body",
          );
          currentEntry = subResult.entryId;
          currentExits = subResult.exitIds;

          if (currentEntry && currentExits.length) {
            for (const exId of currentExits) {
              edges.push({
                id: `loop-edge-${exId}-${currentEntry}`,
                source: exId,
                sourceHandle: "source-bottom",
                target: currentEntry,
                targetHandle: "target-bottom",
                type: "flowEdge",
                label: repeatText,
                animated: true,
              });
            }
          }
          cursorX = subResult.endX;
        } else {
          defaultPositions[b.id] = { x: cursorX, y: startY };
          const pos = userPositions[b.id] || defaultPositions[b.id];

          nodes.push({
            id: b.id,
            type: "flowBlock",
            position: pos,
            data: {
              block: b,
              index: globalIndex++,
              unit,
              currency,
              tasks,
              isSelected: selectedId === b.id,
              parentContext,
              onUpdateBlock,
              onRemoveBlock,
              onDuplicateBlock,
              onSelect,
            },
          });

          edges.push({
            id: `loop-self-${b.id}`,
            source: b.id,
            sourceHandle: "source-bottom",
            target: b.id,
            targetHandle: "target-bottom",
            type: "flowEdge",
            label: repeatText,
            animated: true,
          });

          currentEntry = b.id;
          currentExits = [b.id];
          cursorX += HORIZONTAL_STEP;
        }
      } else if (b.type === BlockType.XOR || b.type === BlockType.AND) {
        defaultPositions[b.id] = { x: cursorX, y: startY };
        const pos = userPositions[b.id] || defaultPositions[b.id];

        nodes.push({
          id: b.id,
          type: "flowBlock",
          position: pos,
          data: {
            block: b,
            index: globalIndex++,
            unit,
            currency,
            tasks,
            isSelected: selectedId === b.id,
            parentContext,
            onUpdateBlock,
            onRemoveBlock,
            onDuplicateBlock,
            onSelect,
          },
        });

        currentEntry = b.id;
        const branches = b.branches || [];

        if (branches.length === 0) {
          currentExits = [b.id];
          cursorX += HORIZONTAL_STEP;
        } else {
          const branchStartX = cursorX + HORIZONTAL_STEP;
          const branchExits: string[] = [];
          let maxBranchEndX = branchStartX;
          const isXor = b.type === BlockType.XOR;

          branches.forEach((br, brIdx) => {
            const offsetY = startY + (brIdx - (branches.length - 1) / 2) * VERTICAL_STEP;
            const defaultBranchName = labels?.branch
              ? `${labels.branch} #${brIdx + 1}`
              : `Branch #${brIdx + 1}`;
            const branchName = br.label || defaultBranchName;
            const edgeLabel = isXor ? `${branchName} • ${br.p ?? 0}%` : branchName;

            if (br.mode === BlockMode.COMPOSITE && br.subBlocks?.length) {
              const subRes = traverseBlocks(
                br.subBlocks,
                branchStartX,
                offsetY,
                `Branch: ${branchName}`,
              );

              if (subRes.entryId) {
                edges.push({
                  id: `edge-gw-${b.id}-${subRes.entryId}`,
                  source: b.id,
                  sourceHandle: "source-right",
                  target: subRes.entryId,
                  targetHandle: "target-left",
                  type: "flowEdge",
                  label: edgeLabel,
                  animated: true,
                });
              }

              branchExits.push(...subRes.exitIds);
              if (subRes.endX > maxBranchEndX) maxBranchEndX = subRes.endX;
            } else {
              const branchNodeId = `branch_${br.id}`;
              defaultPositions[branchNodeId] = { x: branchStartX, y: offsetY };
              const brPos = userPositions[branchNodeId] || defaultPositions[branchNodeId];

              nodes.push({
                id: branchNodeId,
                type: "flowBranch",
                position: brPos,
                data: {
                  branch: br,
                  parentBlockId: b.id,
                  parentBlockType: b.type,
                  index: brIdx,
                  unit,
                  currency,
                  tasks,
                  isSelected: selectedId === br.id,
                  onUpdateBranch,
                  onRemoveBranch,
                  onSelect,
                },
              });

              edges.push({
                id: `edge-gw-${b.id}-${branchNodeId}`,
                source: b.id,
                sourceHandle: "source-right",
                target: branchNodeId,
                targetHandle: "target-left",
                type: "flowEdge",
                label: edgeLabel,
                animated: true,
              });

              branchExits.push(branchNodeId);
              if (branchStartX + HORIZONTAL_STEP > maxBranchEndX) {
                maxBranchEndX = branchStartX + HORIZONTAL_STEP;
              }
            }
          });

          currentExits = branchExits;
          cursorX = maxBranchEndX;
        }
      }

      if (!firstEntryId && currentEntry) {
        firstEntryId = currentEntry;
      }

      if (prevExits.length && currentEntry) {
        for (const prevId of prevExits) {
          edges.push({
            id: `edge-${prevId}-${currentEntry}`,
            source: prevId,
            sourceHandle: "source-right",
            target: currentEntry,
            targetHandle: "target-left",
            type: "flowEdge",
            animated: true,
          });
        }
      }

      prevExits = currentExits;
    }

    return {
      entryId: firstEntryId,
      exitIds: prevExits,
      endX: cursorX,
    };
  }

  traverseBlocks(blocks, 60, 180);

  return { nodes, edges, defaultPositions };
}
