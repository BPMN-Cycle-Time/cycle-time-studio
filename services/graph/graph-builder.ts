import {
  BlockMode,
  BlockType,
  type Block,
  type Branch,
  type ProcessGraph,
  type ProcessGraphEdge,
  type ProcessGraphNode,
  type ProcessNodeShape,
  type Task,
} from "@/types";

export function findTaskById(tasks: Task[] | undefined, id?: string | null): Task | null {
  if (!id || !tasks) return null;
  return tasks.find((t) => t.id === id) ?? null;
}

export function leafTime(
  holder: { taskId?: string | null; time?: number; loopTime?: number; t?: number },
  rawField: "time" | "loopTime" | "t",
  tasks?: Task[],
): number {
  const task = findTaskById(tasks, holder.taskId);
  if (task && typeof task.time === "number") return task.time;
  const raw = holder[rawField];
  return typeof raw === "number" && !isNaN(raw) ? raw : 0;
}

export function computeBranchValue(br: Branch, tasks?: Task[]): number {
  if (br.mode === BlockMode.COMPOSITE && br.subBlocks?.length) {
    return computeSimpleFlowTotal(br.subBlocks, tasks);
  }
  return leafTime(br, "t", tasks);
}

function computeSimpleFlowTotal(blocks: Block[], tasks?: Task[]): number {
  let total = 0;
  for (const b of blocks) {
    if (b.type === BlockType.SEQ) {
      total += leafTime(b, "time", tasks);
    } else if (b.type === BlockType.XOR) {
      const branches = b.branches ?? [];
      const sum = branches.reduce((acc, br) => {
        const p = (br.p ?? 0) / 100;
        return acc + p * computeBranchValue(br, tasks);
      }, 0);
      total += sum;
    } else if (b.type === BlockType.AND) {
      const branches = b.branches ?? [];
      const vals = branches.map((br) => computeBranchValue(br, tasks));
      total += vals.length ? Math.max(...vals) : 0;
    } else if (b.type === BlockType.LOOP) {
      const body =
        b.mode === BlockMode.COMPOSITE && b.subBlocks?.length
          ? computeSimpleFlowTotal(b.subBlocks, tasks)
          : leafTime(b, "loopTime", tasks);
      const r = (b.loopP ?? 0) / 100;
      total += r < 1 ? body / (1 - r) : 0;
    }
  }
  return total;
}

export function blockDisplayName(b: Block, tasks?: Task[]): string {
  if (b.label?.trim()) return b.label.trim();
  const task = findTaskById(tasks, b.taskId);
  if (task) return task.name;
  switch (b.type) {
    case BlockType.SEQ:
      return "Sequence";
    case BlockType.XOR:
      return "XOR";
    case BlockType.AND:
      return "AND";
    case BlockType.LOOP:
      return "Rework";
    default:
      return "Step";
  }
}

export function branchDisplayName(br: Branch, tasks?: Task[]): string {
  // 1. Prefer the linked task's name (e.g. "C") over the branch label
  //    which may be the flow probability label (e.g. "No - 0.3") from BPMN import.
  const task = findTaskById(tasks, br.taskId);
  if (task) return task.name;

  // 2. If COMPOSITE with a single SEQ subBlock, use that subBlock's task name.
  if (br.mode === BlockMode.COMPOSITE && br.subBlocks?.length === 1) {
    const sub = br.subBlocks[0];
    const subTask = findTaskById(tasks, sub.taskId);
    if (subTask) return subTask.name;
    if (sub.label?.trim()) return sub.label.trim();
  }

  // 3. Fall back to the branch's own label or "Branch".
  if (br.label?.trim()) return br.label.trim();
  return "Branch";
}

export function formatTimeValue(n: number): string {
  if (n === Infinity || n === -Infinity) return "∞";
  if (!isFinite(n) || isNaN(n)) return "0";
  const r = Math.round(n * 100) / 100;
  return Object.is(r, -0) ? "0" : r.toString();
}

/**
 * Builds standard ProcessGraph representation with canonical naming
 */
export function buildProcessGraph(blocks: Block[], tasks?: Task[]): ProcessGraph {
  let seq = 0;
  const nodes: ProcessGraphNode[] = [];
  const edges: ProcessGraphEdge[] = [];
  const key: Record<string, string> = {};

  function addNode(
    name: string,
    type: string,
    time: string | number,
    shape: ProcessNodeShape,
    owner: { kind: "block" | "branch"; id: string } | null,
    keyTag?: string,
  ): string {
    seq += 1;
    const id = `n${seq}`;
    nodes.push({
      id,
      name,
      type,
      time: time === "" ? "" : String(time),
      shape,
      owner,
    });
    if (keyTag) key[keyTag] = id;
    return id;
  }

  function link(s: string, t: string, label = "", back = false) {
    edges.push({ s, t, label, back });
  }

  function emitFlow(flowBlocks: Block[]): { entry: string; exit: string } | null {
    if (!flowBlocks.length) return null;
    let prevExit: string | null = null;
    let firstEntry: string | null = null;

    for (const b of flowBlocks) {
      const fragment = emitBlock(b);
      if (!fragment) continue;
      if (!firstEntry) firstEntry = fragment.entry;
      if (prevExit) link(prevExit, fragment.entry, "");
      prevExit = fragment.exit;
    }

    return firstEntry && prevExit ? { entry: firstEntry, exit: prevExit } : null;
  }

  function emitBlock(b: Block): { entry: string; exit: string } | null {
    if (b.type === BlockType.SEQ) {
      if (b.mode === BlockMode.COMPOSITE && b.subBlocks?.length) {
        return emitFlow(b.subBlocks);
      }
      const t = leafTime(b, "time", tasks);
      const id = addNode(
        blockDisplayName(b, tasks),
        "Task",
        t,
        "task",
        { kind: "block", id: b.id },
        `block:${b.id}`,
      );
      return { entry: id, exit: id };
    }

    if (b.type === BlockType.LOOP) {
      let body: { entry: string; exit: string };
      if (b.mode === BlockMode.COMPOSITE && b.subBlocks?.length) {
        const sub = emitFlow(b.subBlocks);
        if (!sub) return null;
        body = sub;
      } else {
        const t = leafTime(b, "loopTime", tasks);
        const taskId = addNode(
          blockDisplayName(b, tasks),
          "Task (loop body)",
          t,
          "task",
          { kind: "block", id: b.id },
          `block:${b.id}`,
        );
        body = { entry: taskId, exit: taskId };
      }

      const p = b.loopP ?? 0;
      const rText = `${formatTimeValue(p)}%`;
      link(body.exit, body.entry, `Repeat ${rText}`, true);
      key[`loop:${b.id}`] = body.entry;
      return body;
    }

    if (b.type === BlockType.XOR || b.type === BlockType.AND) {
      const isXor = b.type === BlockType.XOR;
      const splitType = isXor ? "XOR gateway (split)" : "AND gateway (split)";
      const joinType = isXor ? "XOR gateway (join)" : "AND gateway (join)";
      const shape: ProcessNodeShape = isXor ? "xor" : "and";

      const splitId = addNode(
        isXor ? "XOR Split" : "AND Split",
        splitType,
        "",
        shape,
        { kind: "block", id: b.id },
        `split:${b.id}`,
      );
      const joinId = addNode(
        isXor ? "XOR Join" : "AND Join",
        joinType,
        "",
        shape,
        { kind: "block", id: b.id },
        `join:${b.id}`,
      );

      const branches = b.branches ?? [];
      for (const br of branches) {
        const pText = isXor ? `${formatTimeValue(br.p ?? 0)}%` : "";
        if (br.mode === BlockMode.COMPOSITE && br.subBlocks?.length) {
          const sub = emitFlow(br.subBlocks);
          if (sub) {
            link(splitId, sub.entry, pText);
            link(sub.exit, joinId, "");
            key[`branch:${br.id}`] = sub.entry;
          } else {
            link(splitId, joinId, pText);
          }
        } else {
          const t = leafTime(br, "t", tasks);
          const brNodeId = addNode(
            branchDisplayName(br, tasks),
            "Task",
            t,
            "task",
            { kind: "branch", id: br.id },
            `branch:${br.id}`,
          );
          link(splitId, brNodeId, pText);
          link(brNodeId, joinId, "");
        }
      }

      return { entry: splitId, exit: joinId };
    }

    return null;
  }

  const startId = addNode("Start", "Start event", "", "start", null, "start");
  const flow = emitFlow(blocks);
  const endId = addNode("End", "End event", "", "end", null, "end");

  if (flow) {
    link(startId, flow.entry, "");
    link(flow.exit, endId, "");
  } else {
    link(startId, endId, "");
  }

  const order: Record<string, number> = {};
  nodes.forEach((n, i) => {
    order[n.id] = i;
  });
  edges.sort(
    (a, b) => (order[a.s] ?? 0) - (order[b.s] ?? 0) || (order[a.t] ?? 0) - (order[b.t] ?? 0),
  );

  return { nodes, edges, key };
}
