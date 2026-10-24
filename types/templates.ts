// Domain models for pre-built industry process templates.

import type { Block } from "./block";
import type { Task } from "./task";

export type ProcessTemplateId = "p2p" | "o2c" | "itsm";

export interface ProcessTemplate {
  id: ProcessTemplateId;
  nameKey: string;
  descriptionKey: string;
  defaultUnit: string;
  blocks: Block[];
  tasks: Task[];
}
