// Block types and visual metadata constants.

import { ListOrdered, GitBranch, Split, Repeat } from "lucide-react";
import { BlockType } from "@/types";

export const BLOCK_TYPES: {
  value: BlockType;
  label: string;
  icon: typeof ListOrdered;
}[] = [
  { value: BlockType.SEQ, label: "Step", icon: ListOrdered },
  { value: BlockType.XOR, label: "Decision", icon: GitBranch },
  { value: BlockType.AND, label: "Parallel", icon: Split },
  { value: BlockType.LOOP, label: "Rework loop", icon: Repeat },
];

export const TYPE_META: Record<
  BlockType,
  {
    label: string;
    dot: string;
    border: string;
    bg: string;
    text: string;
    lightBg: string;
    tagBg: string;
  }
> = {
  [BlockType.SEQ]: {
    label: "Sequential step",
    dot: "bg-blue-500",
    border: "border-blue-500/40",
    bg: "bg-blue-500",
    text: "text-blue-600 dark:text-blue-400",
    lightBg: "from-blue-500/10 via-blue-500/3 to-transparent",
    tagBg:
      "bg-blue-500/10 text-blue-700 border-blue-500/30 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800/60",
  },
  [BlockType.XOR]: {
    label: "Decision (XOR)",
    dot: "bg-amber-500",
    border: "border-amber-500/40",
    bg: "bg-amber-500",
    text: "text-amber-600 dark:text-amber-400",
    lightBg: "from-amber-500/10 via-amber-500/3 to-transparent",
    tagBg:
      "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60",
  },
  [BlockType.AND]: {
    label: "Parallel (AND)",
    dot: "bg-emerald-500",
    border: "border-emerald-500/40",
    bg: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
    lightBg: "from-emerald-500/10 via-emerald-500/3 to-transparent",
    tagBg:
      "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60",
  },
  [BlockType.LOOP]: {
    label: "Rework loop",
    dot: "bg-rose-500",
    border: "border-rose-500/40",
    bg: "bg-rose-500",
    text: "text-rose-600 dark:text-rose-400",
    lightBg: "from-rose-500/10 via-rose-500/3 to-transparent",
    tagBg:
      "bg-rose-500/10 text-rose-700 border-rose-500/30 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/60",
  },
};
