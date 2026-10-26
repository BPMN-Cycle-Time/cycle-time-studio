/**
 * Working-time arithmetic: counts only the part of an interval that falls inside the calendar's
 * working blocks on working days, in local time (Date#getDay / setHours).
 */
import type { WorkCalendar } from "@/types";

const MS_PER_HOUR = 3600000;

/** Default office calendar: Mon–Fri 08:30–12:00 and 13:00–17:30. */
export const DEFAULT_WORK_CALENDAR: WorkCalendar = {
  workDays: [1, 2, 3, 4, 5],
  blocks: [
    { start: "08:30", end: "12:00" },
    { start: "13:00", end: "17:30" },
  ],
};

/** Parses "HH:mm" into minutes after midnight, or null when malformed. */
export function parseClock(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 24 || minutes > 59 || (hours === 24 && minutes > 0)) return null;
  return hours * 60 + minutes;
}

/** Valid [startMinute, endMinute) ranges of the calendar. */
function blockMinutes(calendar: WorkCalendar): [number, number][] {
  return calendar.blocks
    .map((b) => [parseClock(b.start), parseClock(b.end)] as const)
    .filter((r): r is readonly [number, number] => r[0] !== null && r[1] !== null && r[1] > r[0])
    .map(([s, e]) => [s, e]);
}

/** Working hours between two epoch-ms instants according to `calendar`. */
export function workingHoursBetween(
  startMs: number,
  endMs: number,
  calendar: WorkCalendar,
): number {
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return 0;
  const ranges = blockMinutes(calendar);
  const workDays = new Set(calendar.workDays);
  if (!ranges.length || !workDays.size) return 0;

  let totalMs = 0;
  const day = new Date(startMs);
  day.setHours(0, 0, 0, 0);
  while (day.getTime() <= endMs) {
    if (workDays.has(day.getDay())) {
      for (const [s, e] of ranges) {
        const blockStart = new Date(day);
        blockStart.setHours(Math.floor(s / 60), s % 60, 0, 0);
        const blockEnd = new Date(day);
        blockEnd.setHours(Math.floor(e / 60), e % 60, 0, 0);
        const lo = Math.max(startMs, blockStart.getTime());
        const hi = Math.min(endMs, blockEnd.getTime());
        if (hi > lo) totalMs += hi - lo;
      }
    }
    // Advance by calendar day (DST-safe), not by a fixed 24h.
    day.setDate(day.getDate() + 1);
    day.setHours(0, 0, 0, 0);
  }
  return totalMs / MS_PER_HOUR;
}
