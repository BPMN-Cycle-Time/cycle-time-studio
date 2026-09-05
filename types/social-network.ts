// Social Network domain models for Organizational Process Mining.

export type SocialMetricType = "handover" | "workingTogether";

export interface SocialNetworkNode {
  id: string;
  label: string;
  activityCount: number;
  handoversSent: number;
  handoversReceived: number;
  workingTogetherCount: number;
  color?: string;
  x?: number;
  y?: number;
}

export interface SocialNetworkEdge {
  id: string;
  source: string;
  target: string;
  weight: number;
  metric: SocialMetricType;
}

export interface SocialEvaluationRow {
  resource: string;
  inDegree: number;
  outDegree: number;
  totalDegree: number;
  betweenness: number;
  inCloseness: number;
  outCloseness: number;
}

export interface SocialNetworkData {
  metric: SocialMetricType;
  nodes: SocialNetworkNode[];
  edges: SocialNetworkEdge[];
  evaluations: SocialEvaluationRow[];
  maxEdgeWeight: number;
  totalInteractions: number;
}
