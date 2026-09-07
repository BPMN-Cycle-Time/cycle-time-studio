import * as XLSX from "xlsx";
import type { EventLogItem } from "@/types";

let idCounter = 0;
function uniqueId(): string {
  idCounter += 1;
  return `evt_${idCounter}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Parses raw CSV content into EventLogItem array.
 * Supports auto-detecting delimiters (comma, semicolon, tab) and column aliases.
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

  const headers = parseRow(firstLine).map((h) => h.toLowerCase().replace(/["\s_-]/g, ""));

  // Column mapping index resolvers
  const findColIndex = (...aliases: string[]): number => {
    const cleanAliases = aliases.map((a) => a.toLowerCase().replace(/["\s_-]/g, ""));
    return headers.findIndex((h) => cleanAliases.includes(h));
  };

  const caseIdx = findColIndex("caseid", "case", "traceid", "trace", "id", "caseno");
  const actIdx = findColIndex(
    "activity",
    "conceptname",
    "task",
    "action",
    "event",
    "step",
    "taskname",
    "tentask",
  );
  const resIdx = findColIndex(
    "resource",
    "orgresource",
    "user",
    "role",
    "performer",
    "executor",
    "personsname",
    "person",
    "nguoithuchien",
  );
  const startIdx = findColIndex(
    "starttimestamp",
    "start",
    "starttime",
    "timestamp",
    "date",
    "thoigianbatdau",
  );
  const endIdx = findColIndex("completetimestamp", "complete", "endtime", "end", "thoigianketthuc");
  const durIdx = findColIndex(
    "duration",
    "leadtime",
    "time",
    "thoigianthucte",
    "thoigianthuctephut",
    "actualduration",
  );
  const costIdx = findColIndex("cost", "price", "expense", "amount", "chiphi");
  const taskIdx = findColIndex("taskid", "taskcode", "task_id", "matask");
  const benchmarkIdx = findColIndex(
    "benchmarkduration",
    "benchmark",
    "dinhmuc",
    "dinhmucphut",
    "sla",
    "standardtime",
    "targetduration",
  );
  const slaStatusIdx = findColIndex("slastatus", "ketqua", "trangthai", "result", "status");

  const items: EventLogItem[] = [];
  const now = Date.now();

  for (let i = 1; i < lines.length; i++) {
    const row = parseRow(lines[i]!);
    if (row.length === 0 || (row.length === 1 && !row[0])) continue;

    const caseId = caseIdx !== -1 && row[caseIdx] ? row[caseIdx]! : `Case_${i}`;
    const activity = actIdx !== -1 && row[actIdx] ? row[actIdx]! : `Activity_${i}`;
    const resource = resIdx !== -1 && row[resIdx] ? row[resIdx]! : "Unassigned";

    let startIso = new Date(now + i * 60000).toISOString();
    if (startIdx !== -1 && row[startIdx]) {
      const d = new Date(row[startIdx]!);
      if (!isNaN(d.getTime())) startIso = d.toISOString();
    }

    let endIso = startIso;
    if (endIdx !== -1 && row[endIdx]) {
      const d = new Date(row[endIdx]!);
      if (!isNaN(d.getTime())) endIso = d.toISOString();
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

    const taskId = taskIdx !== -1 && row[taskIdx] ? row[taskIdx]! : undefined;

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
 * Parses IEEE XES XML text into standard EventLogItem array.
 */
export function parseEventLogXes(xesXml: string): EventLogItem[] {
  const items: EventLogItem[] = [];
  if (!xesXml.includes("<trace")) return items;

  // Regex-based robust parser for browser XML string (no heavy external DOM dependency)
  const traceRegex = /<trace[\s\S]*?<\/trace>/gi;
  const eventRegex = /<event[\s\S]*?<\/event>/gi;
  const attrRegex = /<(string|date|float|int)\s+key="([^"]+)"\s+value="([^"]*)"\s*\/?>/gi;

  let traceMatch: RegExpExecArray | null;
  let caseCounter = 1;

  while ((traceMatch = traceRegex.exec(xesXml)) !== null) {
    const traceBlock = traceMatch[0];

    // Extract Case ID
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

    // Extract Events
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

        if (key === "concept:name") activity = val;
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
 */
export async function parseEventLogFile(file: File): Promise<EventLogItem[]> {
  const name = file.name.toLowerCase();

  // Support Excel (.xlsx, .xls) files directly
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });
    const firstSheetName = wb.SheetNames[0];
    if (firstSheetName) {
      const sheet = wb.Sheets[firstSheetName];
      if (sheet) {
        const csv = XLSX.utils.sheet_to_csv(sheet);
        return parseEventLogCsv(csv);
      }
    }
  }

  const text = await file.text();

  if (name.endsWith(".xes") || name.endsWith(".xml")) {
    const xesParsed = parseEventLogXes(text);
    if (xesParsed.length > 0) return xesParsed;
  }

  if (name.endsWith(".json")) {
    try {
      const data = JSON.parse(text);
      if (Array.isArray(data)) {
        return data.map((d) => ({
          id: d.id || uniqueId(),
          caseId: String(d.caseId || d.case_id || "Case_1"),
          activity: String(d.activity || d.task || "Activity"),
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
      }
    } catch {
      // fallback to CSV if JSON parse fails
    }
  }

  // Default: Parse as CSV
  return parseEventLogCsv(text);
}
