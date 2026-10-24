// Domain models for RPA / Automation Opportunity detection.

export interface AutomationScore {
  frequency: number;
  predictability: number;
  ruleBased: number;
  systemInteraction: number;
  timeSavings: number;
  composite: number;
}

export interface AutomationCandidate {
  id: string;
  activity: string;
  taskId?: string;
  frequency: number;
  avgDuration: number;
  totalDuration: number;
  score: AutomationScore;
  estimatedHoursSaved: number;
  tags: AutomationTag[];
}

export type AutomationTag =
  "highFrequency" | "lowVariance" | "ruleBased" | "systemTask" | "highTimeSavings";

export interface AutomationAnalysis {
  candidates: AutomationCandidate[];
  totalCandidates: number;
  totalEstimatedHoursSaved: number;
  topCandidate: AutomationCandidate | null;
}
