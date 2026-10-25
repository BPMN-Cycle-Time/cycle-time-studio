/**
 * IEEE XES (eXtensible Event Stream) parser for event logs.
 * Handles PM4Py-style `start_timestamp` attributes and `lifecycle:transition`
 * start/complete pairs so activity durations are real, not a 1h placeholder.
 */
import type { EventLogItem } from "@/types";
import { cleanTaskName } from "@/utils/formats";
import { createEventId, parseFlexibleDate } from "./event-log-helpers";

const XML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

/** Decodes the predefined XML entities plus decimal / hex character references. */
export function decodeXmlEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (match, ref: string) => {
    if (ref[0] === "#") {
      const code =
        ref[1] === "x" || ref[1] === "X" ? parseInt(ref.slice(2), 16) : Number(ref.slice(1));
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return XML_ENTITIES[ref.toLowerCase()] ?? match;
  });
}

/** Reads the `key → value` attributes of one XES element (trace header or event body). */
function readAttributes(block: string): Map<string, string> {
  const attrs = new Map<string, string>();
  const attrRegex = /<(?:string|date|float|int|boolean|id)\b([^>]*?)\/?>/gi;
  let match: RegExpExecArray | null;
  while ((match = attrRegex.exec(block)) !== null) {
    const raw = match[1] ?? "";
    const key = /\bkey\s*=\s*"([^"]*)"/i.exec(raw)?.[1];
    const value = /\bvalue\s*=\s*"([^"]*)"/i.exec(raw)?.[1];
    if (key === undefined || value === undefined) continue;
    const decodedKey = decodeXmlEntities(key);
    // First occurrence wins so nested (child) attributes never override the event's own.
    if (!attrs.has(decodedKey)) attrs.set(decodedKey, decodeXmlEntities(value));
  }
  return attrs;
}

const toIso = (raw: string | undefined): string | null => (raw ? parseFlexibleDate(raw) : null);

function hoursBetween(startIso: string, endIso: string): number {
  const diffMs = Math.max(0, new Date(endIso).getTime() - new Date(startIso).getTime());
  return Math.max(0.1, Math.round((diffMs / 3600000) * 100) / 100);
}

const parseNumber = (raw: string | undefined): number | null => {
  if (raw === undefined || raw === "") return null;
  const num = parseFloat(raw);
  return isNaN(num) ? null : num;
};

/**
 * Parses IEEE XES XML text into standard EventLogItem array (event order preserved).
 */
export function parseEventLogXes(xesXml: string): EventLogItem[] {
  const items: EventLogItem[] = [];
  if (!xesXml.includes("<trace")) return items;

  const traceRegex = /<trace\b[\s\S]*?<\/trace>/gi;
  let traceMatch: RegExpExecArray | null;
  let caseCounter = 1;

  while ((traceMatch = traceRegex.exec(xesXml)) !== null) {
    const traceBlock = traceMatch[0];
    const firstEventIdx = traceBlock.search(/<event\b/i);
    const traceHeader = firstEventIdx === -1 ? traceBlock : traceBlock.slice(0, firstEventIdx);
    const caseId = readAttributes(traceHeader).get("concept:name") || `Case_${caseCounter}`;

    // Pending lifecycle "start" timestamps, keyed by activity name (FIFO per activity).
    const pendingStarts = new Map<string, string[]>();
    const eventRegex = /<event\b[\s\S]*?<\/event>/gi;
    let eventMatch: RegExpExecArray | null;

    while ((eventMatch = eventRegex.exec(traceBlock)) !== null) {
      const attrs = readAttributes(eventMatch[0]);
      const activity = cleanTaskName(attrs.get("concept:name")) || "Unknown Activity";
      const timestamp = toIso(attrs.get("time:timestamp")) ?? new Date().toISOString();
      const transition = (attrs.get("lifecycle:transition") ?? "complete").toLowerCase();

      if (transition === "start") {
        pendingStarts.set(activity, [...(pendingStarts.get(activity) ?? []), timestamp]);
        continue;
      }

      const queued = pendingStarts.get(activity);
      const lifecycleStart = queued?.shift();
      const startIso =
        toIso(attrs.get("start_timestamp")) ??
        toIso(attrs.get("time:start")) ??
        lifecycleStart ??
        timestamp;

      const explicitDuration = parseNumber(attrs.get("duration"));
      const duration =
        explicitDuration !== null && explicitDuration >= 0
          ? explicitDuration
          : startIso !== timestamp
            ? hoursBetween(startIso, timestamp)
            : 1;

      items.push({
        id: createEventId(),
        caseId,
        activity,
        resource: attrs.get("org:resource") || "Unassigned",
        startTimestamp: startIso,
        completeTimestamp: timestamp,
        duration,
        cost: parseNumber(attrs.get("cost")) ?? 0,
      });
    }

    // Unpaired "start" events (log without matching "complete") are still kept as events.
    for (const [activity, starts] of pendingStarts) {
      for (const startIso of starts) {
        items.push({
          id: createEventId(),
          caseId,
          activity,
          resource: "Unassigned",
          startTimestamp: startIso,
          completeTimestamp: startIso,
          duration: 1,
          cost: 0,
        });
      }
    }

    caseCounter++;
  }

  return items;
}
