// Block and Branch model types for process flow definitions.

export enum BlockType {
  SEQ = "seq",
  XOR = "xor",
  AND = "and",
  LOOP = "loop",
}

export enum BlockMode {
  SIMPLE = "simple",
  COMPOSITE = "composite",
}

export interface Branch {
  id: string;
  label: string;
  /** Probability weight in % — only meaningful for xor parents. Branches of an xor parent should sum to 100. */
  p?: number;
  /** Relative weight — only meaningful for and parents (informational; and takes the max of branch times). */
  weight?: number;
  /** Direct time for this branch, in the project's unit. Ignored when mode === BlockMode.COMPOSITE. */
  t?: number;
  taskId?: string | null;
  mode?: BlockMode;
  subBlocks?: Block[];
}

export interface Block {
  id: string;
  type: BlockType;
  label: string;
  taskId?: string | null;
  /** Direct time for seq blocks, in the project's unit. Ignored when mode === BlockMode.COMPOSITE. */
  time?: number;
  /** xor | and: the branches taken. */
  branches?: Branch[];
  /** loop: probability (%) that the loop repeats. */
  loopP?: number;
  /** loop: time added per iteration when mode === BlockMode.SIMPLE. */
  loopTime?: number;
  mode?: BlockMode;
  subBlocks?: Block[];
}
