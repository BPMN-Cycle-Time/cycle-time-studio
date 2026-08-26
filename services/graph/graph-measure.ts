import { BlockMode, BlockType, type Block, type Branch } from "@/types";

export const TASK_W = 128;
export const TASK_H = 50;
export const GAP = 30;
export const GW = 32;
export const GW_GAP = 26;
export const BRANCH_VGAP = 20;
export const LABEL_H = 17;
export const LOOP_H = 34;
export const PAD = 26;

export interface FlowMeasurement {
  empty: boolean;
  w: number;
  h: number;
  center: number;
  items: BlockMeasurement[];
}

export type BlockMeasurement =
  | { kind: "task"; block: Block; w: number; h: number; center: number }
  | {
      kind: "rework";
      block: Block;
      body: FlowMeasurement | { single: true; w: number; h: number; center: number };
      w: number;
      h: number;
      center: number;
    }
  | {
      kind: "gateway";
      block: Block;
      branches: {
        branch: Branch;
        content: FlowMeasurement | { single: true; w: number; h: number; center: number };
        h: number;
        center: number;
      }[];
      maxW: number;
      w: number;
      h: number;
      center: number;
    };

export function measureProcessModelFlow(blocks: Block[] | undefined): FlowMeasurement {
  if (!blocks || !blocks.length) {
    return { empty: true, w: 104, h: 40, center: 20, items: [] };
  }
  const items = blocks.map(measureProcessModelBlock);
  const w = items.reduce((s, i) => s + i.w, 0) + GAP * (items.length - 1);
  let above = 0;
  let below = 0;
  items.forEach((i) => {
    above = Math.max(above, i.center);
    below = Math.max(below, i.h - i.center);
  });
  return { empty: false, w, h: above + below, center: above, items };
}

export function measureProcessModelBlock(b: Block): BlockMeasurement {
  if (b.type === BlockType.SEQ) {
    return { kind: "task", block: b, w: TASK_W, h: TASK_H, center: TASK_H / 2 };
  }

  if (b.type === BlockType.LOOP) {
    const body =
      b.mode === BlockMode.COMPOSITE && b.subBlocks?.length
        ? measureProcessModelFlow(b.subBlocks)
        : ({ single: true, w: TASK_W, h: TASK_H, center: TASK_H / 2 } as const);
    return {
      kind: "rework",
      block: b,
      body,
      w: body.w,
      h: LOOP_H + body.h,
      center: LOOP_H + body.center,
    };
  }

  const branches = (b.branches ?? []).map((br) => {
    const content =
      br.mode === BlockMode.COMPOSITE && br.subBlocks?.length
        ? measureProcessModelFlow(br.subBlocks)
        : ({ single: true, w: TASK_W, h: TASK_H, center: TASK_H / 2 } as const);
    return {
      branch: br,
      content,
      h: content.h + LABEL_H,
      center: content.center + LABEL_H,
    };
  });

  let maxW = 0;
  let totalH = 0;
  branches.forEach((x, i) => {
    maxW = Math.max(maxW, x.content.w);
    totalH += x.h + (i > 0 ? BRANCH_VGAP : 0);
  });
  totalH = Math.max(totalH, GW);

  return {
    kind: "gateway",
    block: b,
    branches,
    maxW,
    w: GW + GW_GAP + maxW + GW_GAP + GW,
    h: totalH,
    center: totalH / 2,
  };
}

export function wrapLabel(text: string | undefined, maxChars: number): string[] {
  const words = String(text ?? "")
    .split(/\s+/)
    .filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (test.length > maxChars && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  if (!lines.length) lines.push("");
  if (lines.length > 2) {
    let second = lines[1] ?? "";
    if (second.length > maxChars - 1) second = second.slice(0, maxChars - 1);
    return [lines[0] ?? "", `${second}…`];
  }
  return lines;
}
