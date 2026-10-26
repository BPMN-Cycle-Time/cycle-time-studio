// Performance (processing / waiting time) analysis models derived from an event log. Times are in hours.

export interface DurationStats {
  count: number;
  mean: number;
  median: number;
  p90: number;
  p95: number;
  max: number;
  total: number;
}

export interface ActivityPerformance {
  activity: string;
  processing: DurationStats;
  /** Null when no event of this activity has a predecessor in its case. */
  waiting: DurationStats | null;
}

export interface ResourcePerformance {
  resource: string;
  processing: DurationStats;
  waiting: DurationStats | null;
}

export interface CasePerformance {
  caseId: string;
  /** Start timestamp (ISO) of the case's first event. */
  startTimestamp: string;
  cycleTime: number;
  processingTime: number;
  waitingTime: number;
  /** Cycle time efficiency = processingTime / cycleTime. */
  cte: number;
}

export interface WorkCalendarBlock {
  /** Local time "HH:mm". */
  start: string;
  end: string;
}

export interface WorkCalendar {
  /** Working weekdays, 0 = Sunday … 6 = Saturday. */
  workDays: number[];
  blocks: WorkCalendarBlock[];
}

export interface PerformanceSummary {
  caseCount: number;
  cycleTime: DurationStats;
  processing: DurationStats;
  waiting: DurationStats;
  /** Σ processing / Σ cycle time over all cases. */
  cteOverall: number;
}

export interface PerformanceAnalysis {
  activities: ActivityPerformance[];
  resources: ResourcePerformance[];
  cases: CasePerformance[];
  summary: PerformanceSummary;
  /** Activities sorted by their share (0..1) of the total waiting time, descending. */
  waitingShareRanking: { activity: string; share: number }[];
}

export interface PerformanceOptions {
  calendar?: WorkCalendar;
}
