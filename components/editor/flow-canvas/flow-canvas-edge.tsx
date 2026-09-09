"use client";

import { memo } from "react";
import {
  BaseEdge,
  getBezierPath,
  EdgeLabelRenderer,
  type EdgeProps,
  Position,
} from "@xyflow/react";
import { cn } from "@/utils";

export const FlowCanvasEdge = memo(function FlowCanvasEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition = Position.Right,
  targetPosition = Position.Left,
  style = {},
  markerEnd,
  label,
  selected,
}: EdgeProps) {
  const isLoop =
    id.includes("loop") ||
    (sourcePosition === Position.Bottom && targetPosition === Position.Bottom);
  const isSelfLoop = isLoop && Math.abs(sourceX - targetX) < 45;

  let edgePath = "";
  let labelX = 0;
  let labelY = 0;

  if (isSelfLoop) {
    // Single node looping back to itself below the card
    const loopDepth = 55;
    edgePath = `M ${sourceX} ${sourceY} C ${sourceX + 35} ${sourceY + loopDepth}, ${targetX - 35} ${targetY + loopDepth}, ${targetX} ${targetY}`;
    labelX = (sourceX + targetX) / 2;
    labelY = sourceY + loopDepth;
  } else if (isLoop) {
    // Multi-node loop: Arches cleanly underneath both nodes in an underpass curve!
    // Stays 75px below whichever node is lowest, so it NEVER crosses the horizontal forward arrows!
    const verticalDip = Math.max(sourceY, targetY) + 75;
    edgePath = `M ${sourceX} ${sourceY} C ${sourceX} ${verticalDip}, ${targetX} ${verticalDip}, ${targetX} ${targetY}`;
    labelX = (sourceX + targetX) / 2;
    labelY = verticalDip;
  } else {
    // Standard forward or branching bezier curve
    const [path, lx, ly] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      curvature: 0.35,
    });
    edgePath = path;
    labelX = lx;
    labelY = ly;
  }

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          strokeWidth: 2,
          stroke: selected
            ? "oklch(0.55 0.2 280)" // Purple when selected
            : isLoop
              ? "oklch(0.7 0.16 65)" // Amber for rework loops
              : "oklch(0.65 0.02 150)", // Soft slate/emerald tone for forward flow
          strokeDasharray: isLoop ? "4 4" : "5 5",
          ...style,
        }}
      />

      {/* Decorative Source Dot */}
      <circle
        cx={sourceX}
        cy={sourceY}
        r={3.5}
        className={cn(
          "stroke-card stroke-2 pointer-events-none",
          isLoop ? "fill-amber-500" : "fill-emerald-500",
        )}
      />

      {/* Decorative Target Dot */}
      <circle
        cx={targetX}
        cy={targetY}
        r={3.5}
        className={cn(
          "stroke-2 pointer-events-none",
          isLoop ? "fill-card stroke-amber-500" : "fill-card stroke-muted-foreground/80",
        )}
      />

      {/* Optional Branch Percentage / Condition Label */}
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
            }}
            className={cn(
              "px-2 py-0.5 text-[10px] font-mono font-bold rounded-full backdrop-blur-md border shadow-xs select-none",
              isLoop
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                : "bg-card/95 text-foreground border-border/80",
            )}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});
