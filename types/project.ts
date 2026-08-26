// Project domain models for Cycle Time Studio.

import type { Block } from "./block";
import type { Task } from "./task";

export interface Project {
  id: string;
  name: string;
  unit: string; // e.g. "hours", "days", "minutes"
  tasks: Task[];
  blocks: Block[];
  createdAt: number;
  updatedAt: number;
}

export interface ProjectSummary {
  id: string;
  name: string;
  updatedAt: number;
}
