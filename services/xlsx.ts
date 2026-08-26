import * as XLSX from "xlsx";
import type { ProcessGraphNode, ProcessGraphEdge, ProcessGraph } from "@/types/graph";

export interface RawGraphNodeRecord {
  id: string;
  name: string;
  type?: string;
  time?: string | number;
}

export interface RawGraphEdgeRecord {
  source: string;
  target: string;
  label: string;
  back?: boolean;
}

export interface ParsedGraphResult {
  nodes?: RawGraphNodeRecord[];
  edges?: RawGraphEdgeRecord[];
}

function normalizeKey(k: string): string {
  return k.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Generate CSV formatted string from nodes list.
 */
export function nodesToCsv(nodes: ProcessGraphNode[]): string {
  const header = "Id,NodeName,NodeType,Time";
  const rows = nodes.map((n) => {
    const escName = n.name.includes(",") ? `"${n.name.replace(/"/g, '""')}"` : n.name;
    const escType = n.type.includes(",") ? `"${n.type.replace(/"/g, '""')}"` : n.type;
    return `${n.id},${escName},${escType},${n.time || ""}`;
  });
  return [header, ...rows].join("\n");
}

/**
 * Generate CSV formatted string from edges list.
 */
export function edgesToCsv(edges: ProcessGraphEdge[]): string {
  const header = "Source,Tail,Label,Back";
  const rows = edges.map((e) => {
    const escLabel = e.label.includes(",") ? `"${e.label.replace(/"/g, '""')}"` : e.label;
    return `${e.s},${e.t},${escLabel},${e.back ? "true" : ""}`;
  });
  return [header, ...rows].join("\n");
}

/**
 * Export graph nodes and edges as an XLSX binary buffer/blob.
 */
export function exportGraphToWorkbook(graph: ProcessGraph): Uint8Array {
  const wb = XLSX.utils.book_new();

  const nodesRows = graph.nodes.map((n) => ({
    Id: n.id,
    NodeName: n.name,
    NodeType: n.type,
    Time: n.time || "",
  }));
  const nodesWs = XLSX.utils.json_to_sheet(nodesRows);
  XLSX.utils.book_append_sheet(wb, nodesWs, "nodes");

  const edgesRows = graph.edges.map((e) => ({
    Source: e.s,
    Tail: e.t,
    Label: e.label || "",
    Back: e.back ? "true" : "",
  }));
  const edgesWs = XLSX.utils.json_to_sheet(edgesRows);
  XLSX.utils.book_append_sheet(wb, edgesWs, "edges");

  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  return new Uint8Array(out);
}

/**
 * Simple CSV parser supporting double quotes and standard delimiters.
 */
export function parseCsvString(csvText: string): Record<string, string>[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return [];

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === "," && !inQuotes) {
        result.push(cur.trim());
        cur = "";
      } else {
        cur += c;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const headers = parseLine(lines[0]!);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]!);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? "";
    });
    rows.push(row);
  }

  return rows;
}

/**
 * Normalizes raw node rows from XLSX / CSV into typed RawGraphNodeRecord items.
 */
export function normalizeNodesData(rawList: Record<string, unknown>[]): RawGraphNodeRecord[] {
  const result: RawGraphNodeRecord[] = [];
  for (const item of rawList) {
    const map: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(item)) {
      map[normalizeKey(k)] = v;
    }

    const id = String(map.id ?? "").trim();
    const name = String(map.nodename ?? map.name ?? map.label ?? id).trim();
    const type = String(map.nodetype ?? map.type ?? "Task").trim();
    const rawTime = map.time ?? map.duration ?? "";
    const time = rawTime !== undefined && rawTime !== null ? String(rawTime).trim() : "";

    if (id || name) {
      result.push({
        id: id || `n${result.length + 1}`,
        name: name || id,
        type,
        time,
      });
    }
  }
  return result;
}

/**
 * Normalizes raw edge rows from XLSX / CSV into typed RawGraphEdgeRecord items.
 */
export function normalizeEdgesData(rawList: Record<string, unknown>[]): RawGraphEdgeRecord[] {
  const result: RawGraphEdgeRecord[] = [];
  for (const item of rawList) {
    const map: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(item)) {
      map[normalizeKey(k)] = v;
    }

    const source = String(map.source ?? map.from ?? map.src ?? "").trim();
    const target = String(map.tail ?? map.target ?? map.to ?? map.dst ?? "").trim();
    const label = String(map.label ?? map.probability ?? map.condition ?? "").trim();

    if (source && target) {
      const isBack =
        String(map.back ?? "").toLowerCase() === "true" ||
        label.toLowerCase().includes("rework") ||
        label.toLowerCase().includes("repeat") ||
        label.toLowerCase().includes("loop");

      result.push({
        source,
        target,
        label,
        back: isBack,
      });
    }
  }
  return result;
}

/**
 * Reads and parses an uploaded .xlsx, .xls, or .csv file into raw nodes and edges data.
 */
export async function parseGraphFile(file: File): Promise<ParsedGraphResult> {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });

    let nodesData: RawGraphNodeRecord[] | undefined;
    let edgesData: RawGraphEdgeRecord[] | undefined;

    for (const sheetName of wb.SheetNames) {
      const lower = sheetName.toLowerCase().trim();
      const sheet = wb.Sheets[sheetName];
      if (!sheet) continue;
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

      if (lower.includes("node")) {
        nodesData = normalizeNodesData(json);
      } else if (lower.includes("edge") || lower.includes("flow") || lower.includes("link")) {
        edgesData = normalizeEdgesData(json);
      }
    }

    // If there's only 1 sheet in workbook, inspect column headers
    if ((!nodesData || !edgesData) && wb.SheetNames.length > 0) {
      const firstSheet = wb.Sheets[wb.SheetNames[0]!];
      if (firstSheet) {
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet);
        if (json.length > 0) {
          const sample = json[0]!;
          const keys = Object.keys(sample).map(normalizeKey);
          if (keys.includes("source") || keys.includes("tail") || keys.includes("target")) {
            edgesData = normalizeEdgesData(json);
          } else if (
            keys.includes("id") ||
            keys.includes("nodename") ||
            keys.includes("nodetype")
          ) {
            nodesData = normalizeNodesData(json);
          }
        }
      }
    }

    return { nodes: nodesData, edges: edgesData };
  }

  // Handle CSV file
  const text = await file.text();
  const rows = parseCsvString(text);
  if (!rows.length) return {};

  const sample = rows[0]!;
  const keys = Object.keys(sample).map(normalizeKey);

  if (keys.includes("source") || keys.includes("tail") || keys.includes("target")) {
    return { edges: normalizeEdgesData(rows) };
  }
  if (keys.includes("id") || keys.includes("nodename") || keys.includes("nodetype")) {
    return { nodes: normalizeNodesData(rows) };
  }

  // Fallback by filename
  if (fileName.includes("node")) {
    return { nodes: normalizeNodesData(rows) };
  }
  if (fileName.includes("edge")) {
    return { edges: normalizeEdgesData(rows) };
  }

  return { nodes: normalizeNodesData(rows) };
}

export { graphToBlocksAndTasks, type ReconstructedGraphModel } from "./graph/graph-reconstruct";
