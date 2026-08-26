// Flowchart node models for React Flow and SVG Graph visualisations.

import type { BlockType } from "./block";

export enum SpecialNodeKind {
  START = "start",
  END = "end",
}

export type GraphNodeKind = BlockType | SpecialNodeKind;

export interface GraphNodeData extends Record<string, unknown> {
  label: string;
  kind: GraphNodeKind;
  detail?: string;
  blockId?: string;
  branchId?: string;
}

export type ProcessNodeShape = "task" | "xor" | "and" | "loop" | "start" | "end";

export interface ProcessGraphNodeOwner {
  kind: "block" | "branch";
  id: string;
}

export interface ProcessGraphNode {
  id: string;
  name: string;
  type: string;
  time: string;
  shape: ProcessNodeShape;
  owner: ProcessGraphNodeOwner | null;
}

export interface ProcessGraphEdge {
  s: string;
  t: string;
  label: string;
  back: boolean;
}

export interface ProcessGraph {
  nodes: ProcessGraphNode[];
  edges: ProcessGraphEdge[];
  key: Record<string, string>;
}

export interface ProcessGraphLayoutNode {
  id: string;
  dummy?: boolean;
  rank?: number;
}

export interface ProcessGraphRoutedEdge {
  edge: ProcessGraphEdge;
  path: string[];
}

export interface ProcessGraphLayout {
  xy: Record<string, { x: number; y: number }>;
  byId: Record<string, ProcessGraphLayoutNode>;
  routed: ProcessGraphRoutedEdge[];
  rank: Record<string, number>;
  width: number;
  height: number;
  midY: number;
  maxRows: number;
}
