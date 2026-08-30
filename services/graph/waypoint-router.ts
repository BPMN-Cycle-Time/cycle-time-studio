export interface Point {
  x: number;
  y: number;
}

export enum EdgeRoutingStyle {
  ORTHOGONAL = "orthogonal",
  CURVED = "curved",
  STRAIGHT = "straight",
}

/**
 * Builds a smooth SVG path through an array of waypoints with rounded fillet corners
 * (Draw.io / Miro / BPMN standard orthogonal rounded corners).
 */
export function buildFilletPolylinePath(points: Point[], cornerRadius = 8): string {
  if (points.length < 2) return "";
  if (points.length === 2) {
    return `M ${points[0]!.x} ${points[0]!.y} L ${points[1]!.x} ${points[1]!.y}`;
  }

  let d = `M ${points[0]!.x} ${points[0]!.y}`;

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1]!;
    const curr = points[i]!;
    const next = points[i + 1]!;

    const dx1 = curr.x - prev.x;
    const dy1 = curr.y - prev.y;
    const len1 = Math.hypot(dx1, dy1) || 1;

    const dx2 = next.x - curr.x;
    const dy2 = next.y - curr.y;
    const len2 = Math.hypot(dx2, dy2) || 1;

    const r = Math.min(cornerRadius, len1 / 2.2, len2 / 2.2);

    const cornerInX = curr.x - (dx1 / len1) * r;
    const cornerInY = curr.y - (dy1 / len1) * r;

    const cornerOutX = curr.x + (dx2 / len2) * r;
    const cornerOutY = curr.y + (dy2 / len2) * r;

    d += ` L ${cornerInX} ${cornerInY} Q ${curr.x} ${curr.y} ${cornerOutX} ${cornerOutY}`;
  }

  const last = points[points.length - 1]!;
  d += ` L ${last.x} ${last.y}`;
  return d;
}

/**
 * Builds a smooth Bézier spline path across waypoints.
 */
export function buildSmoothBezierPath(points: Point[]): string {
  if (points.length < 2) return "";
  if (points.length === 2) {
    return `M ${points[0]!.x} ${points[0]!.y} L ${points[1]!.x} ${points[1]!.y}`;
  }

  let d = `M ${points[0]!.x} ${points[0]!.y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i > 0 ? points[i - 1]! : points[i]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = i < points.length - 2 ? points[i + 2]! : p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x} ${p2.y}`;
  }

  return d;
}

/**
 * Builds a direct straight polyline path without rounded corners.
 */
export function buildStraightPolylinePath(points: Point[]): string {
  if (points.length < 2) return "";
  return `M ${points.map((p) => `${p.x} ${p.y}`).join(" L ")}`;
}

/**
 * Universal router path builder supporting all 3 routing styles.
 */
export function buildCustomPath(
  points: Point[],
  style: EdgeRoutingStyle = EdgeRoutingStyle.ORTHOGONAL,
  cornerRadius = 8,
): string {
  if (style === EdgeRoutingStyle.CURVED) {
    return buildSmoothBezierPath(points);
  }
  if (style === EdgeRoutingStyle.STRAIGHT) {
    return buildStraightPolylinePath(points);
  }
  return buildFilletPolylinePath(points, cornerRadius);
}

/**
 * Calculates the midpoint of the longest segment in a polyline
 * for optimal label placement.
 */
export function getMidpointOfLongestSegment(points: Point[]): Point {
  if (points.length < 2) return points[0] || { x: 0, y: 0 };
  let maxLen = -1;
  let bestMid: Point = {
    x: (points[0]!.x + points[1]!.x) / 2,
    y: (points[0]!.y + points[1]!.y) / 2,
  };

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    if (dist > maxLen) {
      maxLen = dist;
      bestMid = {
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2,
      };
    }
  }

  return bestMid;
}

/**
 * Snaps a value to a reference axis if within threshold (default 8px)
 */
export function snapCoordinate(
  val: number,
  refVal: number,
  threshold = 8,
): { val: number; snapped: boolean } {
  if (Math.abs(val - refVal) <= threshold) {
    return { val: refVal, snapped: true };
  }
  return { val, snapped: false };
}
