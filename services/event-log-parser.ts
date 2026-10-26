import * as XLSX from "xlsx";
import type { EventLogItem } from "@/types";
import { cleanTaskName } from "@/utils/formats";
import {
  normalizeColName,
  parseFlexibleDate,
  ALIAS_GROUPS,
  createEventId,
} from "./event-log-helpers";
import { parseEventLogXes } from "./event-log-xes";

export { normalizeColName, parseFlexibleDate, ALIAS_GROUPS, parseEventLogXes };

export interface ParseEventLogResult {
  items: EventLogItem[];
  availableSheets?: string[];
  selectedSheet?: string;
}

/**
 * Parses a 2D array of rows (from CSV or Excel) into EventLogItem array.
 * Scans the first 10 rows to detect the true header row.
 */
export function parseEventLogRows(
  rawRows: (string | number | undefined | null)[][],
): EventLogItem[] {
  if (!rawRows || rawRows.length < 2) return [];

  // Find header row among first 10 rows
  let headerRowIdx = -1;
  let maxMatches = 0;

  for (let r = 0; r < Math.min(10, rawRows.length); r++) {
    const rowNorm = (rawRows[r] || []).map((c) => normalizeColName(String(c ?? "")));
    let matches = 0;
    for (const group of Object.values(ALIAS_GROUPS)) {
      if (rowNorm.some((col) => group.includes(col))) matches++;
    }
    if (matches > maxMatches) {
      maxMatches = matches;
      headerRowIdx = r;
    }
  }

  if (headerRowIdx === -1 || maxMatches === 0) return [];

  const headers = (rawRows[headerRowIdx] || []).map((c) => normalizeColName(String(c ?? "")));

  const findColIndex = (...aliases: string[]): number => {
    const cleanAliases = aliases.map(normalizeColName);
    for (const alias of cleanAliases) {
      const idx = headers.indexOf(alias);
      if (idx !== -1) return idx;
    }
    return headers.findIndex((h) => cleanAliases.includes(h));
  };

  const caseIdx = findColIndex(...ALIAS_GROUPS.case);
  const actIdx = findColIndex(...ALIAS_GROUPS.act);
  const roleIdx = findColIndex(...ALIAS_GROUPS.role);
  // Logs with only a role column keep using it as the performer.
  const explicitResIdx = findColIndex(...ALIAS_GROUPS.res);
  const resIdx = explicitResIdx !== -1 ? explicitResIdx : roleIdx;
  const startIdx = findColIndex(...ALIAS_GROUPS.start);
  const endIdx = findColIndex(...ALIAS_GROUPS.end);
  const durIdx = findColIndex(...ALIAS_GROUPS.dur);
  const costIdx = findColIndex(...ALIAS_GROUPS.cost);
  const taskIdx = findColIndex(...ALIAS_GROUPS.task);
  const benchmarkIdx = findColIndex(...ALIAS_GROUPS.benchmark);
  const slaStatusIdx = findColIndex(...ALIAS_GROUPS.status);

  const mappedIdx = new Set([
    caseIdx,
    actIdx,
    resIdx,
    roleIdx,
    startIdx,
    endIdx,
    durIdx,
    costIdx,
    taskIdx,
    benchmarkIdx,
    slaStatusIdx,
  ]);
  const rawHeaders = (rawRows[headerRowIdx] || []).map((c) =>
    String(c ?? "")
      .replace(/^\uFEFF/, "")
      .trim(),
  );
  const extraIdx = rawHeaders
    .map((_, idx) => idx)
    .filter((idx) => !mappedIdx.has(idx) && rawHeaders[idx]);

  const items: EventLogItem[] = [];
  const now = Date.now();

  for (let i = headerRowIdx + 1; i < rawRows.length; i++) {
    const row = (rawRows[i] || []).map((c) => String(c ?? "").trim());
    if (row.length === 0 || row.every((c) => c === "")) continue;

    const rowNum = i - headerRowIdx;
    const caseId = caseIdx !== -1 && row[caseIdx] ? row[caseIdx]! : `Case_${rowNum}`;
    const rawAct = actIdx !== -1 && row[actIdx] ? row[actIdx]! : `Activity_${rowNum}`;
    const resource = resIdx !== -1 && row[resIdx] ? row[resIdx]! : "Unassigned";
    const role = roleIdx !== -1 && row[roleIdx] ? row[roleIdx]! : undefined;
    const attributes: Record<string, string> = {};
    for (const idx of extraIdx) if (row[idx]) attributes[rawHeaders[idx]!] = row[idx]!;

    let taskId = taskIdx !== -1 && row[taskIdx] ? row[taskIdx]! : undefined;
    const activity = cleanTaskName(rawAct);

    if (!taskId) {
      const codeMatch = rawAct.match(/^(?:Task[-_\s]*\d+|T-?\d+)/i);
      if (codeMatch) {
        taskId = codeMatch[0].trim();
      }
    }

    let startIso = new Date(now + i * 60000).toISOString();
    if (startIdx !== -1 && row[startIdx]) {
      const parsed = parseFlexibleDate(row[startIdx]!);
      if (parsed) startIso = parsed;
    }

    let endIso = startIso;
    if (endIdx !== -1 && row[endIdx]) {
      const parsed = parseFlexibleDate(row[endIdx]!);
      if (parsed) endIso = parsed;
    }

    let duration = 1;
    if (durIdx !== -1 && row[durIdx]) {
      const parsed = parseFloat(row[durIdx]!);
      if (!isNaN(parsed) && parsed >= 0) duration = parsed;
    } else if (startIso && endIso && startIso !== endIso) {
      const diffMs = Math.max(0, new Date(endIso).getTime() - new Date(startIso).getTime());
      duration = Math.max(0.1, Math.round((diffMs / 3600000) * 100) / 100);
    }

    let cost = 0;
    if (costIdx !== -1 && row[costIdx]) {
      const parsed = parseFloat(row[costIdx]!.replace(/[^0-9.-]/g, ""));
      if (!isNaN(parsed) && parsed >= 0) cost = parsed;
    }

    // taskId already extracted above

    let benchmarkDuration: number | undefined;
    if (benchmarkIdx !== -1 && row[benchmarkIdx]) {
      const parsed = parseFloat(row[benchmarkIdx]!);
      if (!isNaN(parsed) && parsed >= 0) benchmarkDuration = parsed;
    }

    let slaStatus: "met" | "delayed" | undefined;
    if (slaStatusIdx !== -1 && row[slaStatusIdx]) {
      const statusText = row[slaStatusIdx]!.toLowerCase();
      if (
        statusText.includes("dat") ||
        statusText.includes("met") ||
        statusText.includes("pass") ||
        statusText.includes("ok")
      ) {
        slaStatus = "met";
      } else if (
        statusText.includes("tre") ||
        statusText.includes("delay") ||
        statusText.includes("fail") ||
        statusText.includes("late")
      ) {
        slaStatus = "delayed";
      }
    }
    if (!slaStatus && benchmarkDuration !== undefined) {
      slaStatus = duration <= benchmarkDuration ? "met" : "delayed";
    }

    items.push({
      id: createEventId(),
      caseId,
      activity,
      resource,
      role,
      startTimestamp: startIso,
      completeTimestamp: endIso,
      duration,
      cost,
      taskId,
      benchmarkDuration,
      slaStatus,
      ...(extraIdx.length ? { attributes } : {}),
    });
  }

  return items;
}

/**
 * Parses raw CSV content into EventLogItem array.
 */
export function parseEventLogCsv(csvContent: string): EventLogItem[] {
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return [];

  // Auto-detect delimiter from first row
  const firstLine = lines[0]!;
  let delimiter = ",";
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;

  if (semiCount > commaCount && semiCount > tabCount) delimiter = ";";
  else if (tabCount > commaCount && tabCount > semiCount) delimiter = "\t";

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const rawRows = lines.map(parseRow);
  return parseEventLogRows(rawRows);
}

/**
 * Universal file reader & parser for uploaded event logs.
 * Supports multi-sheet Excel (.xlsx, .xls) with smart sheet scoring and custom sheet selection.
 */
export async function parseEventLogFile(
  file: File,
  targetSheet?: string,
): Promise<ParseEventLogResult> {
  const name = file.name.toLowerCase();

  // Support Excel (.xlsx, .xls) files directly
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, {
      type: "array",
      cellDates: true,
      dateNF: "yyyy-mm-dd hh:mm:ss",
    });
    const availableSheets = wb.SheetNames;

    // Explicit sheet requested
    if (targetSheet && wb.Sheets[targetSheet]) {
      const sheet = wb.Sheets[targetSheet]!;
      const rawRows = XLSX.utils.sheet_to_json<string[]>(sheet, {
        header: 1,
        raw: false,
        defval: "",
      });
      const items = parseEventLogRows(rawRows);
      return { items, availableSheets, selectedSheet: targetSheet };
    }

    // Smart automatic sheet selection
    let bestSheet = availableSheets[0] || "";
    let bestScore = -1;
    let bestItems: EventLogItem[] = [];

    for (const sheetName of availableSheets) {
      const sheet = wb.Sheets[sheetName];
      if (!sheet) continue;
      const rawRows = XLSX.utils.sheet_to_json<string[]>(sheet, {
        header: 1,
        raw: false,
        defval: "",
      });
      const items = parseEventLogRows(rawRows);
      const assignedCount = items.filter((it) => it.resource !== "Unassigned").length;
      const distinctCases = new Set(items.map((it) => it.caseId)).size;

      // Score based on rows, assigned resources, distinct cases, and sheet naming
      let score = items.length * 2 + assignedCount * 15 + distinctCases * 5;
      if (/log|event|nhat\s*ky|du\s*lieu|data|trace|case/i.test(sheetName)) {
        score += 50;
      }

      if (score > bestScore) {
        bestScore = score;
        bestSheet = sheetName;
        bestItems = items;
      }
    }

    return {
      items: bestItems,
      availableSheets,
      selectedSheet: bestSheet,
    };
  }

  const text = await file.text();

  if (name.endsWith(".xes") || name.endsWith(".xml")) {
    const xesParsed = parseEventLogXes(text);
    if (xesParsed.length > 0) return { items: xesParsed, availableSheets: [] };
  }

  if (name.endsWith(".json")) {
    try {
      const data = JSON.parse(text);
      if (Array.isArray(data)) {
        const items = data.map((d) => ({
          id: d.id || createEventId(),
          caseId: String(d.caseId || d.case_id || "Case_1"),
          activity: cleanTaskName(String(d.activity || d.task || "Activity")),
          resource: String(d.resource || d.role || "Unassigned"),
          role: d.role ? String(d.role) : undefined,
          startTimestamp: String(d.startTimestamp || d.start || new Date().toISOString()),
          completeTimestamp: String(d.completeTimestamp || d.end || new Date().toISOString()),
          duration: typeof d.duration === "number" ? d.duration : 1,
          cost: typeof d.cost === "number" ? d.cost : 0,
          taskId: d.taskId ? String(d.taskId) : undefined,
          benchmarkDuration:
            typeof d.benchmarkDuration === "number" ? d.benchmarkDuration : undefined,
          slaStatus: d.slaStatus === "met" || d.slaStatus === "delayed" ? d.slaStatus : undefined,
        }));
        return { items, availableSheets: [] };
      }
    } catch {
      // fallback to CSV if JSON parse fails
    }
  }

  // Default: Parse as CSV
  return { items: parseEventLogCsv(text), availableSheets: [] };
}
