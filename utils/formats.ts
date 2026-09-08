// Formatting utility functions.

export function formatTime(value: number, unit?: string, decimals = 2): string {
  const formatted = value.toFixed(decimals);
  return unit ? `${formatted} ${unit}` : formatted;
}

export function formatPercent(value: number, decimals = 0): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatDate(timestamp: number | Date): string {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function slugify(text?: string, defaultFallback = "project"): string {
  if (!text || !text.trim()) return defaultFallback;
  const slug = text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || defaultFallback;
}

/**
 * Strips task code prefixes (e.g. "T01 - ", "T06: ", "T-01 - ", "Task 01 - ", "T06. ")
 * as well as probability annotations or flow markers from a task/activity/branch name.
 */
export function cleanTaskName(rawName?: string): string {
  if (!rawName) return "";
  let name = rawName.trim();

  // Strip leading task code prefixes like "T06 - ", "T01: ", "T-1 - ", "Task 02: ", "T06. "
  name = name.replace(/^(?:Task[-_\s]*\d+|T-?\d+)\s*[-:._/]\s*/i, "");
  // Also strip leading code if followed by whitespace and letters, e.g. "T06 Bao khach"
  name = name.replace(/^(?:Task[-_\s]*\d+|T-?\d+)\s+(?=[A-Za-z\u00C0-\u024F\u1EA0-\u1EF9])/i, "");

  // Strip trailing rework suffixes, e.g. " (lai)", " (lại)", " (rework)"
  name = name.replace(/\s*\((?:lai|lại|rework|re-?)\)\s*$/i, "");

  // Strip trailing probability annotations or flow markers,
  // e.g. "No - 0.3" -> "No", "Yes - 0.7" -> "Yes", "Reject (30%)" -> "Reject".
  name = name.replace(
    /\s*[-:=~]\s*(?:p\s*=\s*)?(?:0(?:\.\d+)?|1(?:\.0+)?|\d+(?:\.\d+)?%)\s*$/i,
    "",
  );
  name = name.replace(/\s*\((?:p\s*=\s*)?(?:0(?:\.\d+)?|1(?:\.0+)?|\d+(?:\.\d+)?%)\)\s*$/i, "");

  return name.trim() || rawName.trim();
}

/**
 * Formats internal generated IDs (e.g. "task_1_8r3mp", "blk_1_abcde", UUIDs)
 * into a clean, human-readable display ID like "T-1", "T-2", etc.
 */
export function formatDisplayTaskId(rawId: string | undefined, index: number): string {
  if (!rawId) return `T-${index + 1}`;
  const trimmed = rawId.trim();
  const isInternal =
    /^task[_-]/i.test(trimmed) ||
    /^blk[_-]/i.test(trimmed) ||
    /^Activity_[a-z0-9]+/i.test(trimmed) ||
    /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(trimmed);

  if (isInternal) {
    return `T-${index + 1}`;
  }
  return trimmed;
}
