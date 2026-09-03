// Project domain models for Cycle Time Studio.

import type { Block } from "./block";
import type { Task } from "./task";

export interface Project {
  id: string;
  name: string;
  unit: string; // e.g. "hours", "days", "minutes"
  currency?: string; // e.g. "USD", "VND", "EUR", "GBP"
  tasks: Task[];
  blocks: Block[];
  bpmnXml?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectSummary {
  id: string;
  name: string;
  updatedAt: number;
}
