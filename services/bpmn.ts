import { BpmnModdle } from "bpmn-moddle";
import { layoutProcess } from "bpmn-auto-layout";
import type { Block, Task } from "@/types";
import {
  buildImportGraph,
  collectLaneNames,
  detectLoops,
  parseProbability,
  walkChain,
  type MoFlowElement,
  type MoLane,
} from "./bpmn-import";

/**
 * Bidirectional bridge between our Block/Branch tree and BPMN 2.0 XML.
 */

let idCounter = 0;
function freshId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${idCounter}_${Math.random().toString(36).slice(2, 7)}`;
}

import { BpmnBuilder, blocksToSemanticXml } from "./bpmn-builder";
export { BpmnBuilder, blocksToSemanticXml, parseProbability };

/** Full pipeline: blocks -> semantic XML -> auto-laid-out XML ready to load into bpmn-js. */
export async function blocksToBpmnXml(
  blocks: Block[],
  processName = "Process",
  tasks?: Task[],
): Promise<string> {
  const semantic = blocksToSemanticXml(blocks, processName, tasks);
  return layoutProcess(semantic);
}

// ---------------------------------------------------------------------------
// BPMN XML -> Blocks
// ---------------------------------------------------------------------------

export interface BpmnImportResult {
  blocks: Block[];
  tasks: Task[];
  warnings: string[];
}

export async function bpmnXmlToBlocks(
  xml: string,
  existingTasks?: Task[],
): Promise<BpmnImportResult> {
  const moddle = new BpmnModdle();
  const { rootElement, references } = await moddle.fromXML(xml);
  void references;

  const warnings: string[] = [];
  const process = rootElement.rootElements?.find((r: MoFlowElement) => r.$type === "bpmn:Process");
  if (!process)
    return {
      blocks: [],
      tasks: existingTasks || [],
      warnings: ["No <bpmn:process> found in this file."],
    };

  const flowElements: MoFlowElement[] = process.flowElements ?? [];
  const start = flowElements.find((el) => el.$type === "bpmn:StartEvent");
  if (!start) {
    warnings.push("No start event found — cannot determine where the flow begins.");
    return { blocks: [], tasks: existingTasks || [], warnings };
  }
  const starts = flowElements.filter((el) => el.$type === "bpmn:StartEvent");
  if (starts.length > 1)
    warnings.push(`This diagram has ${starts.length} start events — only the first was used.`);

  const pools = rootElement.rootElements?.filter(
    (r: MoFlowElement) => r.$type === "bpmn:Collaboration",
  );
  if (pools?.length)
    warnings.push("This file has multiple pools/lanes — only the first process was converted.");

  const laneSets: { lanes?: MoLane[] }[] = process.laneSets ?? [];
  const laneOf = collectLaneNames(laneSets.flatMap((set) => set.lanes ?? []));
  const graph = buildImportGraph(flowElements, laneOf);
  const tasks: Task[] = existingTasks ? [...existingTasks] : [];
  const blocks = walkChain(start.id, null, {
    graph,
    loops: detectLoops(graph, start.id),
    tasks,
    warnings,
    frames: [],
    steps: 0,
    depth: 0,
    freshId,
  });
  return { blocks, tasks, warnings };
}
