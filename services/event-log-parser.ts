import * as XLSX from "xlsx";
import type { EventLogItem } from "@/types";
import { cleanTaskName } from "@/utils/formats";
import { normalizeColName, parseFlexibleDate, ALIAS_GROUPS } from "./event-log-helpers";

export { normalizeColName, parseFlexibleDate, ALIAS_GROUPS };

let idCounter = 0;
function uniqueId(): string {
  idCounter += 1;
  return `evt_${idCounter}_${Math.random().toString(36).slice(2, 7)}`;
}

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
  const resIdx = findColIndex(...ALIAS_GROUPS.res);
  const startIdx = findColIndex(...ALIAS_GROUPS.start);
  const endIdx = findColIndex(...ALIAS_GROUPS.end);
  const durIdx = findColIndex(...ALIAS_GROUPS.dur);
  const costIdx = findColIndex(...ALIAS_GROUPS.cost);
  const taskIdx = findColIndex(...ALIAS_GROUPS.task);
  const benchmarkIdx = findColIndex(...ALIAS_GROUPS.benchmark);
  const slaStatusIdx = findColIndex(...ALIAS_GROUPS.status);

  const items: EventLogItem[] = [];
  const now = Date.now();

  for (let i = headerRowIdx + 1; i < rawRows.length; i++) {
    const row = (rawRows[i] || []).map((c) => String(c ?? "").trim());
    if (row.length === 0 || row.every((c) => c === "")) continue;

    const rowNum = i - headerRowIdx;
    const caseId = caseIdx !== -1 && row[caseIdx] ? row[caseIdx]! : `Case_${rowNum}`;
    const rawAct = actIdx !== -1 && row[actIdx] ? row[actIdx]! : `Activity_${rowNum}`;
    const resource = resIdx !== -1 && row[resIdx] ? row[resIdx]! : "Unassigned";

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
      id: uniqueId(),
      caseId,
      activity,
      resource,
      startTimestamp: startIso,
      completeTimestamp: endIso,
      duration,
      cost,
      taskId,
      benchmarkDuration,
      slaStatus,
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
 * Parses IEEE XES XML text into standard EventLogItem array.
 */
export function parseEventLogXes(xesXml: string): EventLogItem[] {
  const items: EventLogItem[] = [];
  if (!xesXml.includes("<trace")) return items;

  const traceRegex = /<trace[\s\S]*?<\/trace>/gi;
  const eventRegex = /<event[\s\S]*?<\/event>/gi;
  const attrRegex = /<(string|date|float|int)\s+key="([^"]+)"\s+value="([^"]*)"\s*\/?>/gi;

  let traceMatch: RegExpExecArray | null;
  let caseCounter = 1;

  while ((traceMatch = traceRegex.exec(xesXml)) !== null) {
    const traceBlock = traceMatch[0];

    let caseId = `Case_${caseCounter}`;
    const traceHeader = traceBlock.slice(
      0,
      traceBlock.indexOf("<event") !== -1 ? traceBlock.indexOf("<event") : undefined,
    );
    let attrMatch: RegExpExecArray | null;
    while ((attrMatch = attrRegex.exec(traceHeader)) !== null) {
      if (attrMatch[2] === "concept:name") {
        caseId = attrMatch[3] || caseId;
        break;
      }
    }

    let eventMatch: RegExpExecArray | null;
    while ((eventMatch = eventRegex.exec(traceBlock)) !== null) {
      const eventBlock = eventMatch[0];
      let activity = "Unknown Activity";
      let resource = "Unassigned";
      let timestamp = new Date().toISOString();
      let duration = 1;
      let cost = 0;

      let eventAttrMatch: RegExpExecArray | null;
      while ((eventAttrMatch = attrRegex.exec(eventBlock)) !== null) {
        const key = eventAttrMatch[2];
        const val = eventAttrMatch[3] || "";

        if (key === "concept:name") activity = cleanTaskName(val);
        else if (key === "org:resource") resource = val;
        else if (key === "time:timestamp") timestamp = val;
        else if (key === "duration") {
          const num = parseFloat(val);
          if (!isNaN(num)) duration = num;
        } else if (key === "cost") {
          const num = parseFloat(val);
          if (!isNaN(num)) cost = num;
        }
      }

      items.push({
        id: uniqueId(),
        caseId,
        activity,
        resource,
        startTimestamp: timestamp,
        completeTimestamp: timestamp,
        duration,
        cost,
      });
    }

    caseCounter++;
  }

  return items;
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
          id: d.id || uniqueId(),
          caseId: String(d.caseId || d.case_id || "Case_1"),
          activity: cleanTaskName(String(d.activity || d.task || "Activity")),
          resource: String(d.resource || d.role || "Unassigned"),
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
