import type { Edge, Node } from "@xyflow/react";
import { BlockMode, BlockType, SpecialNodeKind, type Block, type GraphNodeData } from "@/types";

const ROW_HEIGHT = 120;
const COL_WIDTH = 240;

let rfSeq = 0;
function rfNid(prefix: string) {
  rfSeq += 1;
  return `${prefix}_${rfSeq}`;
}

interface BuildCtx {
  nodes: Node<GraphNodeData>[];
  edges: Edge[];
}

interface LayoutBlock extends Block {
  _isBranch?: boolean;
}

function layoutChain(
  blocks: LayoutBlock[],
  x: number,
  y: number,
  ctx: BuildCtx,
): { tailIds: string[]; y: number; firstId: string | null } {
  let cursorIds: string[] = [];
  let row = y;
  let firstId: string | null = null;

  for (const b of blocks) {
    const result = layoutRfBlock(b, x, row, ctx);
    for (const from of cursorIds) {
      for (const to of result.entryIds) {
        ctx.edges.push({
          id: rfNid("e"),
          source: from,
          target: to,
          animated: false,
          labelStyle: { fontSize: 11, fill: "var(--muted-foreground)" },
        });
      }
    }
    if (!firstId) firstId = result.entryIds[0] ?? null;
    cursorIds = result.tailIds;
    row = result.y;
  }
  return { tailIds: cursorIds, y: row, firstId };
}

function layoutRfBlock(
  b: LayoutBlock,
  x: number,
  y: number,
  ctx: BuildCtx,
): { entryIds: string[]; tailIds: string[]; y: number } {
  if (b.type === BlockType.SEQ) {
    if (b.mode === BlockMode.COMPOSITE && b.subBlocks?.length) {
      const { firstId, tailIds, y: ny } = layoutChain(b.subBlocks, x, y, ctx);
      return { entryIds: firstId ? [firstId] : [], tailIds, y: ny };
    }
    const id = rfNid("n");
    ctx.nodes.push({
      id,
      type: "flow",
      position: { x, y },
      data: {
        label: b.label,
        kind: BlockType.SEQ,
        detail: `${b.time ?? 0}`,
        blockId: b._isBranch ? undefined : b.id,
        branchId: b._isBranch ? b.id : undefined,
      },
    });
    return { entryIds: [id], tailIds: [id], y: y + ROW_HEIGHT };
  }

  if (b.type === BlockType.XOR || b.type === BlockType.AND) {
    const gwId = rfNid("gw");
    ctx.nodes.push({
      id: gwId,
      type: "flow",
      position: { x, y },
      data: {
        label: b.label,
        kind: b.type,
        blockId: b.id,
      },
    });
    const branches = b.branches ?? [];
    const n = branches.length;
    const startXOffset = -((n - 1) * COL_WIDTH) / 2;
    let maxY = y + ROW_HEIGHT;
    const tailIds: string[] = [];

    branches.forEach((br, i) => {
      const bx = x + startXOffset + i * COL_WIDTH;
      const branchBlocks: LayoutBlock[] =
        br.mode === BlockMode.COMPOSITE && br.subBlocks?.length
          ? br.subBlocks
          : [
              {
                id: br.id,
                type: BlockType.SEQ,
                label: br.label,
                time: br.t,
                mode: BlockMode.SIMPLE,
                _isBranch: true,
              },
            ];
      const {
        firstId,
        tailIds: bTails,
        y: by,
      } = layoutChain(branchBlocks, bx, y + ROW_HEIGHT, ctx);
      if (firstId) {
        ctx.edges.push({
          id: rfNid("e"),
          source: gwId,
          target: firstId,
          label: b.type === BlockType.XOR ? `${br.p ?? 0}%` : br.label,
          animated: false,
          labelStyle: { fontSize: 11, fill: "var(--muted-foreground)" },
        });
      }
      tailIds.push(...bTails);
      maxY = Math.max(maxY, by);
    });

    return { entryIds: [gwId], tailIds: tailIds.length ? tailIds : [gwId], y: maxY };
  }

  if (b.type === BlockType.LOOP) {
    const bodyBlocks: LayoutBlock[] =
      b.mode === BlockMode.COMPOSITE && b.subBlocks?.length
        ? b.subBlocks
        : [
            {
              id: b.id,
              type: BlockType.SEQ,
              label: b.label,
              time: b.loopTime,
              mode: BlockMode.SIMPLE,
            },
          ];
    const { firstId, tailIds, y: ny } = layoutChain(bodyBlocks, x, y, ctx);
    if (firstId && tailIds.length) {
      for (const t of tailIds) {
        ctx.edges.push({
          id: rfNid("e"),
          source: t,
          target: firstId,
          label: `Repeat ${b.loopP ?? 0}%`,
          animated: false,
          style: { strokeDasharray: "4 3" },
          labelStyle: { fontSize: 11, fill: "var(--muted-foreground)" },
        });
      }
    }
    return { entryIds: firstId ? [firstId] : [], tailIds, y: ny };
  }

  return { entryIds: [], tailIds: [], y };
}

export function blocksToGraph(blocks: Block[]): { nodes: Node<GraphNodeData>[]; edges: Edge[] } {
  rfSeq = 0;
  const ctx: BuildCtx = { nodes: [], edges: [] };
  const startId = rfNid("start");
  ctx.nodes.push({
    id: startId,
    type: "flow",
    position: { x: 0, y: 0 },
    data: { label: "Start", kind: SpecialNodeKind.START },
  });

  const { firstId, tailIds, y } = layoutChain(blocks, 0, ROW_HEIGHT, ctx);
  if (firstId) {
    ctx.edges.push({
      id: rfNid("e"),
      source: startId,
      target: firstId,
      animated: false,
      labelStyle: { fontSize: 11, fill: "var(--muted-foreground)" },
    });
  }

  const endId = rfNid("end");
  ctx.nodes.push({
    id: endId,
    type: "flow",
    position: { x: 0, y },
    data: { label: "End", kind: SpecialNodeKind.END },
  });
  for (const t of tailIds.length ? tailIds : [startId]) {
    ctx.edges.push({
      id: rfNid("e"),
      source: t,
      target: endId,
      animated: false,
      labelStyle: { fontSize: 11, fill: "var(--muted-foreground)" },
    });
  }

  return { nodes: ctx.nodes, edges: ctx.edges };
}
