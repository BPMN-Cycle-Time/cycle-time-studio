// Domain models for Heuristics Miner / Directly-Follows Graph discovery.

export interface DfgNode {
  id: string;
  label: string;
  frequency: number;
  isStart: boolean;
  isEnd: boolean;
}

export interface DfgEdge {
  source: string;
  target: string;
  frequency: number;
  dependency: number;
}

export interface HeuristicsMinerResult {
  nodes: DfgNode[];
  edges: DfgEdge[];
  bpmnXml: string;
  blocks: import("./block").Block[];
  tasks: import("./task").Task[];
  activitiesCount: number;
  transitionsCount: number;
  startActivities: string[];
  endActivities: string[];
}

export interface HeuristicsMinerOptions {
  frequencyThreshold?: number;
  dependencyThreshold?: number;
  loopThreshold?: number;
}
