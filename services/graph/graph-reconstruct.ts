import { v4 as uuid } from "uuid";
import { BlockType, BlockMode, type Block, type Branch, type Task } from "@/types";
import { parseProbability } from "../bpmn";
import type { RawGraphNodeRecord, RawGraphEdgeRecord } from "../xlsx";

export interface ReconstructedGraphModel {
  blocks: Block[];
  tasks: Task[];
  warnings: string[];
}

/**
 * Reconstructs the hierarchy of Blocks and Tasks from flat nodes and edges.
 */
export function graphToBlocksAndTasks(
  rawNodes: RawGraphNodeRecord[],
  rawEdges: RawGraphEdgeRecord[],
): ReconstructedGraphModel {
  const warnings: string[] = [];
  const nodeMap = new Map<string, RawGraphNodeRecord>();
  rawNodes.forEach((n) => nodeMap.set(n.id, n));

  const tasks: Task[] = [];
  const taskMapByNodeId = new Map<string, Task>();

  // Extract tasks
  for (const n of rawNodes) {
    const typeLower = (n.type ?? "").toLowerCase();
    const isEvent =
      typeLower.includes("event") || typeLower.includes("start") || typeLower.includes("end");
    const isGateway =
      typeLower.includes("gateway") || typeLower.includes("split") || typeLower.includes("join");

    if (!isEvent && !isGateway) {
      const timeVal = parseFloat(String(n.time || "1")) || 1;
      const task: Task = {
        id: uuid(),
        name: n.name || n.id,
        time: timeVal,
        usedMinutes: 0,
      };
      tasks.push(task);
      taskMapByNodeId.set(n.id, task);
    }
  }

  const forwardAdj = new Map<string, { target: string; label: string; back: boolean }[]>();
  const inDegree = new Map<string, number>();

  rawNodes.forEach((n) => {
    forwardAdj.set(n.id, []);
    inDegree.set(n.id, 0);
  });

  const reworkLoopNodes = new Set<string>();

  // Populate edges
  rawEdges.forEach((e) => {
    const from = e.source;
    const to = e.target;
    if (forwardAdj.has(from) && nodeMap.has(to)) {
      if (e.back) {
        reworkLoopNodes.add(to);
      }
      forwardAdj.get(from)!.push({ target: to, label: e.label || "", back: !!e.back });
      if (!e.back) {
        inDegree.set(to, (inDegree.get(to) ?? 0) + 1);
      }
    }
  });

  // Find start node
  let startNodeId: string | undefined = rawNodes.find(
    (n) =>
      (n.type ?? "").toLowerCase().includes("start") ||
      (n.name ?? "").toLowerCase().includes("start"),
  )?.id;

  if (!startNodeId) {
    for (const [id, deg] of inDegree.entries()) {
      if (deg === 0) {
        startNodeId = id;
        break;
      }
    }
  }

  if (!startNodeId && rawNodes.length > 0) {
    startNodeId = rawNodes[0]!.id;
  }

  const blocks: Block[] = [];
  const visited = new Set<string>();

  let current: string | undefined = startNodeId;

  while (current && !visited.has(current)) {
    visited.add(current);
    const node = nodeMap.get(current);
    if (!node) break;

    const typeLower = (node.type ?? "").toLowerCase();
    const isStart = typeLower.includes("start");
    const isEnd = typeLower.includes("end");
    const isGatewaySplit =
      typeLower.includes("split") ||
      (typeLower.includes("gateway") && !typeLower.includes("join") && !typeLower.includes("loop"));
    const isLoopGw = typeLower.includes("loop") || reworkLoopNodes.has(node.id);

    const outs: { target: string; label: string; back: boolean }[] = forwardAdj.get(current) ?? [];

    if (isStart) {
      current = outs[0]?.target;
      continue;
    }

    if (isEnd) {
      break;
    }

    if (isLoopGw) {
      current = outs[0]?.target;
      continue;
    }

    if (isGatewaySplit || outs.length > 1) {
      const isXor =
        typeLower.includes("xor") || outs.some((o: { label: string }) => o.label.includes("%"));
      const branches: Branch[] = [];

      // Find corresponding join node if any
      let joinNodeId: string | undefined = undefined;
      const allReachable = new Set<string>();
      for (const out of outs) {
        const pathNode = out.target;
        const nextOuts: { target: string; label: string; back: boolean }[] =
          forwardAdj.get(pathNode) ?? [];
        for (const no of nextOuts) {
          const nextType = (nodeMap.get(no.target)?.type ?? "").toLowerCase();
          if (nextType.includes("join")) {
            joinNodeId = no.target;
            break;
          }
          if (allReachable.has(no.target)) {
            joinNodeId = no.target;
            break;
          }
          allReachable.add(no.target);
        }
        if (joinNodeId) break;
      }

      const autoP = isXor ? Math.floor(100 / (outs.length || 1)) : undefined;

      for (let bIdx = 0; bIdx < outs.length; bIdx++) {
        const out = outs[bIdx]!;
        const branchTargetNode = nodeMap.get(out.target);
        const prob = isXor ? (parseProbability(out.label, autoP ?? 50) ?? autoP ?? 50) : undefined;
        const branchLabel =
          out.label || branchTargetNode?.name || `Branch ${String.fromCharCode(65 + bIdx)}`;

        // If branch is a single step before join
        const branchOuts: { target: string; label: string; back: boolean }[] =
          forwardAdj.get(out.target) ?? [];
        if (branchTargetNode && (!joinNodeId || branchOuts.some((o) => o.target === joinNodeId))) {
          const branchTask = taskMapByNodeId.get(branchTargetNode.id);
          branches.push({
            id: uuid(),
            label: branchLabel,
            p: prob,
            t: branchTask?.time ?? 1,
            taskId: branchTask?.id ?? null,
            mode: BlockMode.SIMPLE,
          });
          visited.add(branchTargetNode.id);
        } else {
          branches.push({
            id: uuid(),
            label: branchLabel,
            p: prob,
            t: 1,
            mode: BlockMode.SIMPLE,
          });
        }
      }

      blocks.push({
        id: uuid(),
        type: isXor ? BlockType.XOR : BlockType.AND,
        label: node.name || (isXor ? "Decision Gateway" : "Parallel Gateway"),
        mode: BlockMode.SIMPLE,
        branches,
      });

      if (joinNodeId) {
        current = (forwardAdj.get(joinNodeId) ?? [])[0]?.target;
      } else {
        current = undefined;
      }
      continue;
    }

    // Sequence / Task / Rework Step
    const task = taskMapByNodeId.get(node.id);
    const hasBackLoop = outs.some((o) => o.back) || reworkLoopNodes.has(node.id);

    if (hasBackLoop) {
      const loopEdge = outs.find((o) => o.back);
      const loopP = loopEdge ? (parseProbability(loopEdge.label, 20) ?? 20) : 20;

      blocks.push({
        id: uuid(),
        type: BlockType.LOOP,
        label: node.name || "Rework Loop",
        mode: BlockMode.SIMPLE,
        loopTime: task?.time ?? (parseFloat(String(node.time || "1")) || 1),
        loopP,
        taskId: task?.id ?? null,
      });
    } else {
      blocks.push({
        id: uuid(),
        type: BlockType.SEQ,
        label: node.name || "Process Step",
        mode: BlockMode.SIMPLE,
        time: task?.time ?? (parseFloat(String(node.time || "1")) || 1),
        taskId: task?.id ?? null,
      });
    }

    const nextForward = outs.find((o) => !o.back);
    current = nextForward?.target;
  }

  // Fallback if graph traversal yielded 0 blocks
  if (blocks.length === 0 && tasks.length > 0) {
    tasks.forEach((t) => {
      blocks.push({
        id: uuid(),
        type: BlockType.SEQ,
        label: t.name,
        time: t.time,
        taskId: t.id,
        mode: BlockMode.SIMPLE,
      });
    });
  }

  return { blocks, tasks, warnings };
}
