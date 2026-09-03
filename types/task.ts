// Task domain model for timesheet tracking.

export interface Task {
  id: string;
  name: string;
  /** Direct time duration for this task in the project's unit (e.g. hours). */
  time?: number;
  /** Hourly / resource labor rate per unit time. */
  hourlyRate?: number;
  /** Direct fixed overhead, material, or license cost. */
  fixedCost?: number;
  /** Minutes of raw time logged against this task (used by the timesheet view). */
  usedMinutes?: number;
}
