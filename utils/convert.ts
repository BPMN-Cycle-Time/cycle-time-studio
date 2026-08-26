// Unit and value conversion utility functions.

export function convertPercentToRatio(percent: number): number {
  return percent / 100;
}

export function convertRatioToPercent(ratio: number): number {
  return ratio * 100;
}

export function convertUnit(value: number, fromUnit: string, toUnit: string): number {
  const normalize = (u: string) => u.toLowerCase().trim();
  const f = normalize(fromUnit);
  const t = normalize(toUnit);

  if (f === t) return value;

  // Convert to minutes as base unit
  let inMinutes = value;
  if (f.startsWith("hour")) inMinutes = value * 60;
  else if (f.startsWith("day")) inMinutes = value * 60 * 24;
  else if (f.startsWith("sec")) inMinutes = value / 60;

  // Convert from minutes to target unit
  if (t.startsWith("hour")) return inMinutes / 60;
  if (t.startsWith("day")) return inMinutes / (60 * 24);
  if (t.startsWith("sec")) return inMinutes * 60;

  return inMinutes;
}
