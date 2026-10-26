// Event Log domain models for Process Mining simulation and export.

export interface EventLogItem {
  id: string;
  caseId: string;
  activity: string;
  resource: string;
  /** Organisational role / lane of the performer (e.g. CSV `role`, XES `org:role`), when the log has one. */
  role?: string;
  startTimestamp: string;
  completeTimestamp: string;
  duration: number;
  cost: number;
  taskId?: string;
  blockId?: string;
  benchmarkDuration?: number | null;
  slaStatus?: "met" | "delayed" | null;
  /** Extra columns / attributes of the source log not mapped to a field above. */
  attributes?: Record<string, string>;
}

export interface TaskBenchmarkSummary {
  taskId: string;
  taskName: string;
  benchmarkDuration: number | null;
  totalInstances: number;
  metCount: number;
  delayedCount: number;
  complianceRate: number;
  avgActualDuration: number;
  maxDelay: number;
}

export interface SlaEvaluationResult {
  taskSummaries: TaskBenchmarkSummary[];
  totalInstances: number;
  totalMet: number;
  totalDelayed: number;
  overallComplianceRate: number;
  topDelayedTasks: {
    taskId: string;
    taskName: string;
    delayedCount: number;
    delayedRate: number;
  }[];
}

export interface EventLogConfig {
  caseCount: number;
  startDate?: string;
  arrivalInterval?: number;
  timeVariancePercent?: number;
  customResourcePool?: string[];
}

export interface EventLogSummary {
  totalEvents: number;
  totalCases: number;
  distinctActivities: number;
  distinctResources: number;
  avgCaseDuration: number;
  avgCaseCost: number;
}
