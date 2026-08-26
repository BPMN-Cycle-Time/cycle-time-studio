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
