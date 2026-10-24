// Template applier: returns the block/task payload for a pre-defined industry template.

import { PROCESS_TEMPLATES } from "@/constants/templates";
import type { ProcessTemplate, ProcessTemplateId } from "@/types";

export function getProcessTemplate(id: ProcessTemplateId): ProcessTemplate | undefined {
  return PROCESS_TEMPLATES.find((t) => t.id === id);
}

export function listProcessTemplates(): ProcessTemplate[] {
  return PROCESS_TEMPLATES;
}
