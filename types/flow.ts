// Calculation results and contribution tree models.

export enum ContributionKind {
  BLOCK = "block",
  BRANCH = "branch",
}

export interface ContributionRow {
  id: string;
  label: string;
  /** Expected time contributed to the overall total, in the project's unit. */
  expected: number;
  /** Share of the grand total, 0..1. */
  share: number;
  depth: number;
  kind: ContributionKind;
  /** For xor branches: the probability multiplier actually applied (p/100). */
  multiplier?: number;
  /** Branches on an "and" parent, or the branch not taken in expectation terms, are shown but excluded from the total. */
  excluded?: boolean;
}

export interface FlowResult {
  total: number;
  contributions: ContributionRow[];
}
