"use client";

import type { ReactNode } from "react";

export interface ActiveGuideline {
  x?: number;
  y?: number;
  canvasWidth: number;
  canvasHeight: number;
}

export function DiagramGuidelines({ guideline }: { guideline: ActiveGuideline | null }): ReactNode {
  if (!guideline) return null;

  return (
    <g className="diagram-guidelines pointer-events-none">
      {guideline.x !== undefined && (
        <line
          x1={guideline.x}
          y1={0}
          x2={guideline.x}
          y2={guideline.canvasHeight}
          stroke="var(--primary, #3987e5)"
          strokeWidth={1}
          strokeDasharray="4 4"
          opacity={0.85}
        />
      )}
      {guideline.y !== undefined && (
        <line
          x1={0}
          y1={guideline.y}
          x2={guideline.canvasWidth}
          y2={guideline.y}
          stroke="var(--primary, #3987e5)"
          strokeWidth={1}
          strokeDasharray="4 4"
          opacity={0.85}
        />
      )}
    </g>
  );
}
