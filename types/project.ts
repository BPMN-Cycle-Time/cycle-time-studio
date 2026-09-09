import type { Block } from "./block";
import type { Task } from "./task";
import type { EventLogItem } from "./event-log";

export type EventLogDataSource = "simulated" | "imported";

export interface Project {
  id: string;
  name: string;
  unit: string; // e.g. "hours", "days", "minutes"
  currency?: string; // e.g. "USD", "VND", "EUR", "GBP"
  tasks: Task[];
  blocks: Block[];
  bpmnXml?: string;
  uploadedEvents?: EventLogItem[] | null;
  eventLogDataSource?: EventLogDataSource;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectSummary {
  id: string;
  name: string;
  updatedAt: number;
}
