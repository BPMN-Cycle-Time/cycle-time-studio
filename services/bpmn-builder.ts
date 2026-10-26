/**
 * BPMN 2.0 Semantic XML Builder & Block-to-XML Renderer.
 * Constructs clean BPMN XML with proper incoming/outgoing references
 * required for bpmn-auto-layout and BPMN DI edge rendering.
 */

import { BlockType, BlockMode, type Block, type Task } from "@/types";

import { isEmptyBranch } from "@/utils/blocks";
import { cleanTaskName } from "@/utils/formats";

export interface BpmnNodeDef {
  id: string;
  tag: "task" | "startEvent" | "endEvent" | "exclusiveGateway" | "parallelGateway";
  name: string;
  incoming: string[];
  outgoing: string[];
}

export interface BpmnFlowDef {
  id: string;
  sourceId: string;
  targetId: string;
  name?: string;
}

export class BpmnBuilder {
  processName: string;
  nodes: Map<string, BpmnNodeDef>;
  flows: BpmnFlowDef[];
  private counter: number;

  constructor(processName = "Process") {
    this.processName = processName;
    this.nodes = new Map();
    this.flows = [];
    this.counter = 0;
  }

  freshId(prefix: string): string {
    this.counter += 1;
    return `${prefix}_${this.counter}_${Math.random().toString(36).slice(2, 7)}`;
  }

  addNode(
    prefix: string,
    tag: "task" | "startEvent" | "endEvent" | "exclusiveGateway" | "parallelGateway",
    name = "",
  ): string {
    const id = this.freshId(prefix);
    this.nodes.set(id, { id, tag, name, incoming: [], outgoing: [] });
    return id;
  }

  addFlow(sourceId: string, targetId: string, name = ""): string {
    const id = this.freshId("Flow");
    const flow: BpmnFlowDef = { id, sourceId, targetId, name };
    this.flows.push(flow);

    const sNode = this.nodes.get(sourceId);
    if (sNode) sNode.outgoing.push(id);

    const tNode = this.nodes.get(targetId);
    if (tNode) tNode.incoming.push(id);

    return id;
  }

  escapeXml(s: string): string {
    return (s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  toXml(): string {
    const nodesXml = Array.from(this.nodes.values()).map((n) => {
      const nameAttr = n.name ? ` name="${this.escapeXml(n.name)}"` : "";
      const inXml = n.incoming.map((f) => `<bpmn:incoming>${f}</bpmn:incoming>`);
      const outXml = n.outgoing.map((f) => `<bpmn:outgoing>${f}</bpmn:outgoing>`);
      const children = [...inXml, ...outXml].join("\n      ");
      if (children) {
        return `<bpmn:${n.tag} id="${n.id}"${nameAttr}>\n      ${children}\n    </bpmn:${n.tag}>`;
      }
      return `<bpmn:${n.tag} id="${n.id}"${nameAttr} />`;
    });

    const flowsXml = this.flows.map((f) => {
      const nameAttr = f.name ? ` name="${this.escapeXml(f.name)}"` : "";
      return `<bpmn:sequenceFlow id="${f.id}"${nameAttr} sourceRef="${f.sourceId}" targetRef="${f.targetId}" />`;
    });

    return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  id="Definitions_1" targetNamespace="http://cycletime.studio/bpmn">
  <bpmn:process id="Process_1" name="${this.escapeXml(this.processName)}" isExecutable="false">
    ${nodesXml.join("\n    ")}
    ${flowsXml.join("\n    ")}
  </bpmn:process>
</bpmn:definitions>`;
  }
}

/** Renders a flat array of blocks as a connected chain, returning its start/tail ids. */
export function renderChain(
  blocks: Block[],
  builder: BpmnBuilder,
  afterId: string | null,
  tasks?: Task[],
): { startId: string | null; tailId: string | null } {
  let prevId = afterId;
  let startId: string | null = null;

  for (const b of blocks) {
    const res = renderBlock(b, builder, prevId, tasks);
    if (!startId) startId = res.startId;
    prevId = res.tailId;
  }

  return { startId: startId ?? prevId, tailId: prevId };
}

/**
 * Label of a loop's repeat flow. Always carries the repeat probability (read back by the importer):
 * "Repeat (30%)", or "<custom label> (30%)" when the loop has its own, non-default label.
 */
function loopFlowLabel(b: Block, taskName?: string): string {
  const pct = `${b.loopP ?? 0}%`;
  const label = cleanTaskName(b.label);
  const isDefault = !label || label === "Rework loop" || label === "Loop" || label === taskName;
  return isDefault ? `Repeat (${pct})` : `${label} (${pct})`;
}

/** Renders a single block, wires it after `afterId` (if any), returns startId and tailId. */
export function renderBlock(
  b: Block,
  builder: BpmnBuilder,
  afterId: string | null,
  tasks?: Task[],
): { startId: string | null; tailId: string | null } {
  if (b.type === BlockType.SEQ) {
    if (b.mode === BlockMode.COMPOSITE && b.subBlocks?.length) {
      const { startId, tailId } = renderChain(b.subBlocks, builder, null, tasks);
      if (afterId && startId) builder.addFlow(afterId, startId);
      return { startId: startId ?? afterId, tailId: tailId ?? startId ?? afterId };
    }
    const taskName = (b.taskId ? tasks?.find((t) => t.id === b.taskId)?.name : null) || b.label;
    const taskId = builder.addNode("Task", "task", taskName);
    if (afterId) builder.addFlow(afterId, taskId);
    return { startId: taskId, tailId: taskId };
  }

  if (b.type === BlockType.XOR || b.type === BlockType.AND) {
    const isXor = b.type === BlockType.XOR;
    const splitId = builder.addNode(
      isXor ? "GwSplit" : "PwSplit",
      isXor ? "exclusiveGateway" : "parallelGateway",
      b.label,
    );
    if (afterId) builder.addFlow(afterId, splitId);

    const branchTails: string[] = [];
    const emptyBranchFlows: string[] = [];
    for (const br of b.branches ?? []) {
      const brTaskName = br.taskId ? tasks?.find((t) => t.id === br.taskId)?.name : null;
      const isTaskName =
        brTaskName && br.label?.trim().toLowerCase() === brTaskName.trim().toLowerCase();
      let flowName = "";
      if (isXor) {
        // Keep the probability in the flow label so it survives export → import, e.g. "Yes (72.5%)".
        const hasOwnLabel = !!br.label && !isTaskName && br.label !== "Branch";
        const pct = br.p != null ? `${br.p}%` : "";
        if (hasOwnLabel) flowName = pct ? `${cleanTaskName(br.label)} (${pct})` : br.label;
        else flowName = pct;
      } else {
        flowName = !isTaskName && br.label !== "Branch" ? br.label || "" : "";
      }

      if (isEmptyBranch(br)) {
        // Pure routing path: draw split → join directly (no fake task), keep the flow label.
        emptyBranchFlows.push(flowName);
        continue;
      }

      const branchBlocks: Block[] =
        br.mode === BlockMode.COMPOSITE && br.subBlocks?.length
          ? br.subBlocks
          : [
              {
                id: br.id,
                type: BlockType.SEQ,
                label: brTaskName || cleanTaskName(br.label),
                taskId: br.taskId,
                time: br.t,
                mode: BlockMode.SIMPLE,
              } as Block,
            ];
      const { startId, tailId } = renderChain(branchBlocks, builder, null, tasks);
      if (startId) builder.addFlow(splitId, startId, flowName);
      branchTails.push(tailId ?? splitId);
    }

    const joinId = builder.addNode(
      isXor ? "GwJoin" : "PwJoin",
      isXor ? "exclusiveGateway" : "parallelGateway",
    );
    for (const t of branchTails) {
      builder.addFlow(t, joinId);
    }
    for (const flowName of emptyBranchFlows) {
      builder.addFlow(splitId, joinId, flowName);
    }
    return { startId: splitId, tailId: joinId };
  }

  if (b.type === BlockType.LOOP) {
    const isSingleTask =
      b.mode !== BlockMode.COMPOSITE || !b.subBlocks?.length || b.subBlocks.length === 1;

    if (isSingleTask) {
      const loopTaskName = b.taskId ? tasks?.find((t) => t.id === b.taskId)?.name : null;
      const taskName = loopTaskName || b.label;
      const taskId = builder.addNode("Task", "task", taskName);
      if (afterId) builder.addFlow(afterId, taskId);

      const decisionGwId = builder.addNode("LoopDecision", "exclusiveGateway");
      builder.addFlow(taskId, decisionGwId);

      builder.addFlow(decisionGwId, taskId, loopFlowLabel(b, taskName));

      return { startId: taskId, tailId: decisionGwId };
    }

    const mergeGwId = builder.addNode("LoopMerge", "exclusiveGateway");
    if (afterId) builder.addFlow(afterId, mergeGwId);

    const { tailId } = renderChain(b.subBlocks!, builder, mergeGwId, tasks);

    const decisionGwId = builder.addNode("LoopDecision", "exclusiveGateway");
    builder.addFlow(tailId ?? mergeGwId, decisionGwId);

    builder.addFlow(decisionGwId, mergeGwId, loopFlowLabel(b));

    return { startId: mergeGwId, tailId: decisionGwId };
  }

  return { startId: afterId, tailId: afterId };
}

export function blocksToSemanticXml(blocks: Block[], processName: string, tasks?: Task[]): string {
  const builder = new BpmnBuilder(processName);
  const startId = builder.addNode("Start", "startEvent", "Start");
  const { tailId } = renderChain(blocks, builder, startId, tasks);
  const endId = builder.addNode("End", "endEvent", "End");
  if (tailId) builder.addFlow(tailId, endId);

  return builder.toXml();
}
