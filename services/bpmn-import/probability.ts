/** Probability / repeat-rate parsing for BPMN sequence-flow labels. */

/**
 * Intelligently extracts a probability / repeat percentage (0..100) from a label string.
 * Handles formats:
 * - "Yes - 0.7" -> 70
 * - "No - 0.3" -> 30
 * - "r1 - 0.5" -> 50
 * - "r2 - 0.4" -> 40
 * - "70%" or "Repeat (50%)" -> 70 / 50
 * - "p = 0.65" -> 65
 * - "Branch 1 - 25%" -> 25
 * - "0.8" -> 80
 */
export function parseProbability(rawLabel?: string, defaultVal?: number): number | undefined {
  if (!rawLabel || !rawLabel.trim()) return defaultVal;
  const label = rawLabel.trim();

  // 1. Explicit percentage: e.g. "70%", "50.5%", "Repeat (20%)", "r1 - 50%"
  const percentMatch = label.match(/(\d+(?:\.\d+)?)\s*%/);
  if (percentMatch && percentMatch[1]) {
    const val = parseFloat(percentMatch[1]);
    if (!isNaN(val)) return Math.min(100, Math.max(0, val));
  }

  // 2. Explicit decimal ratio in (0, 1] e.g. "0.7", "0.5", "r1 - 0.5", "Yes - 0.7", "p=0.4"
  const decimalMatch = label.match(/(?:^|[-:=~,\s(])\s*(0(?:\.\d+)?|1(?:\.0+)?)(?:$|[-:=~,\s)%])/);
  if (decimalMatch && decimalMatch[1]) {
    const val = parseFloat(decimalMatch[1]);
    if (!isNaN(val)) {
      return Math.min(100, Math.max(0, Math.round(val * 100 * 100) / 100));
    }
  }

  // 3. Number after delimiter: e.g. "Yes - 70", "r1: 50", "p = 40", "r1 - 50"
  const delimMatch = label.match(/(?:[-:=~]|p(?:rob)?|repeat|rate)\s*[:=]?\s*(\d+(?:\.\d+)?)/i);
  if (delimMatch && delimMatch[1]) {
    const val = parseFloat(delimMatch[1]);
    if (!isNaN(val)) {
      return val <= 1 && val > 0
        ? Math.round(val * 100 * 100) / 100
        : Math.min(100, Math.max(0, val));
    }
  }

  // 4. Fallback: take the last number in the string (ignores prefix IDs like 'r1' or 'flow2' if followed by actual number)
  const allNumbers = Array.from(label.matchAll(/(\d+(?:\.\d+)?)/g));
  if (allNumbers.length > 0) {
    const lastNumStr = allNumbers[allNumbers.length - 1]![1]!;
    const val = parseFloat(lastNumStr);
    if (!isNaN(val)) {
      return val <= 1 && val > 0
        ? Math.round(val * 100 * 100) / 100
        : Math.min(100, Math.max(0, val));
    }
  }

  return defaultVal;
}
