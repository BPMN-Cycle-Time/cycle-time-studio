// App-wide common constants.

export const APP_NAME = "Cycle Time Studio";
export const DEFAULT_UNIT = "hours";
export const TIME_UNITS = ["seconds", "minutes", "hours", "days", "weeks"] as const;

export const STORAGE_KEYS = {
  PROJECTS_INDEX: "cycletime:projects-index",
  PROJECT_PREFIX: "cycletime:project:",
  RIGHT_PANEL_COLLAPSED: "rightpanel:collapsed",
} as const;
