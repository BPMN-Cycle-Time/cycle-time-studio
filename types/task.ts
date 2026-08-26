// Task domain model for timesheet tracking.

export interface Task {
  id: string;
  name: string;
  /** Direct time duration for this task in the project's unit (e.g. hours). */
  time?: number;
  /** Minutes of raw time logged against this task (used by the timesheet view). */
  usedMinutes?: number;
}
