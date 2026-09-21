export type BprTechnique =
  | "elimination"
  | "resequencing"
  | "parallelization"
  | "specialization"
  | "resourceOptimization"
  | "communicationOptimization"
  | "automation";

export type BprIssueType =
  | "reworkLoop"
  | "bottleneck"
  | "highCost"
  | "conformanceViolation"
  | "slaBreach"
  | "lowConformanceFitness"
  | "longWaitTime";

export type BprSeverity = "low" | "medium" | "high" | "critical";

export type BprImpact = "low" | "medium" | "high";

export interface BprAsIsMetrics {
  totalTime: number;
  totalCost: number;
  laborCost: number;
  fixedCost: number;
  taskCount: number;
  xorCount: number;
  andCount: number;
  loopCount: number;
  fitness?: number;
  slaCompliance?: number;
}

export interface BprIssue {
  id: string;
  type: BprIssueType;
  severity: BprSeverity;
  title: string;
  description: string;
  evidence: string;
  affectedTaskIds: string[];
  affectedTaskNames: string[];
}

export interface BprRecommendation {
  id: string;
  technique: BprTechnique;
  title: string;
  description: string;
  relatedIssueIds: string[];
  impact: BprImpact;
  confidence: BprImpact;
}

export interface BprAnalysis {
  metrics: BprAsIsMetrics;
  issues: BprIssue[];
  recommendations: BprRecommendation[];
}
