// Conformance Checking domain types for Process Mining & Process Compliance.

export type ConformanceViolationType =
  | "skipped_activity" // Bỏ bước bắt buộc
  | "out_of_order" // Sai thứ tự quy trình
  | "unexpected_activity" // Bước ngoài quy trình
  | "wrong_resource"; // Sai vai trò thực hiện

export interface ConformanceViolation {
  id: string;
  caseId: string;
  type: ConformanceViolationType;
  activity: string;
  expected?: string;
  actual?: string;
  resource?: string;
  stepIndex?: number;
  message: string;
}

export interface CaseStepDetail {
  activity: string;
  resource: string;
  timestamp: string;
  duration: number;
  cost: number;
  status: "conformant" | "skipped" | "out_of_order" | "unexpected" | "wrong_resource";
  violationMessage?: string;
}

export interface CaseConformanceResult {
  caseId: string;
  isConformant: boolean;
  fitnessScore: number; // 0 - 100%
  expectedActivities: string[];
  executedActivities: string[];
  violations: ConformanceViolation[];
  steps: CaseStepDetail[];
  totalDuration: number;
  totalCost: number;
}

export interface TraceVariantInfo {
  variantId: string;
  pattern: string[];
  count: number;
  frequencyPercent: number;
  isConformant: boolean;
  cases: string[];
}

export interface LogConformanceAnalysis {
  totalCases: number;
  conformantCases: number;
  nonConformantCases: number;
  overallFitnessScore: number; // 0 - 100%
  violationCounts: Record<ConformanceViolationType, number>;
  caseResults: CaseConformanceResult[];
  variants: TraceVariantInfo[];
}
