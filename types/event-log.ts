// Event Log domain models for Process Mining simulation and export.

export interface EventLogItem {
  id: string;
  caseId: string;
  activity: string;
  resource: string;
  startTimestamp: string;
  completeTimestamp: string;
  duration: number;
  cost: number;
  taskId?: string;
  blockId?: string;
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
