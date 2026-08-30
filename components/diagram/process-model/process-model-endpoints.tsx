"use client";

import type { ReactNode } from "react";

interface ProcessModelStartEndpointProps {
  startId: string;
  showIds: boolean;
  startCx: number;
  startCy: number;
  startArrowX1: number;
  startArrowY1: number;
  startArrowX2: number;
  startArrowY2: number;
  firstBlockId: string | null;
  draggingTargetId: string | null;
  onPointerDown: (e: React.PointerEvent, targetKey: string) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onInsertClick: (targetId: string, pos: "before" | "after") => void;
}

export function ProcessModelStartEndpoint({
  startId,
  showIds,
  startCx,
  startCy,
  startArrowX1,
  startArrowY1,
  startArrowX2,
  startArrowY2,
  firstBlockId,
  draggingTargetId,
  onPointerDown,
  onPointerUp,
  onInsertClick,
}: ProcessModelStartEndpointProps): ReactNode {
  const startKey = "start-event";
  const startMidX = (startArrowX1 + startArrowX2) / 2;
  const startMidY = (startArrowY1 + startArrowY2) / 2;

  return (
    <>
      <g
        key={startKey}
        className={`node static ${draggingTargetId === startKey ? "dragging" : ""}`}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => onPointerDown(e, startKey)}
        onPointerUp={onPointerUp}
      >
        <circle
          cx={startCx}
          cy={startCy}
          r={17}
          fill="var(--card, #ffffff)"
          stroke="var(--foreground, #23261f)"
          strokeWidth={1.8}
        />
        {showIds && (
          <text
            x={startCx}
            y={startCy - 24}
            textAnchor="middle"
            fontSize={10}
            fill="var(--muted-foreground, #6f7266)"
            fontFamily="ui-monospace, monospace"
          >
            {startId}
          </text>
        )}
      </g>

      {firstBlockId && (
        <g
          key="start-insert"
          className="ins"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => onInsertClick(firstBlockId, "before")}
        >
          <circle
            cx={startMidX}
            cy={startMidY}
            r={8}
            fill="var(--secondary, #ebe8e0)"
            stroke="var(--border, #ddd7c8)"
            strokeWidth={1}
          />
          <text
            x={startMidX}
            y={startMidY + 4}
            textAnchor="middle"
            fontSize={12}
            fontWeight={700}
            fill="var(--muted-foreground, #6f7266)"
            fontFamily="ui-monospace, monospace"
          >
            +
          </text>
          <title>Insert block here</title>
        </g>
      )}

      <line
        key="arrow-start"
        x1={startArrowX1}
        y1={startArrowY1}
        x2={startArrowX2}
        y2={startArrowY2}
        stroke="var(--foreground, #23261f)"
        strokeWidth={1.5}
        markerEnd="url(#pm-arrow)"
      />
    </>
  );
}

interface ProcessModelEndEndpointProps {
  endId: string;
  showIds: boolean;
  endCx: number;
  endCy: number;
  endArrowX1: number;
  endArrowY1: number;
  endArrowX2: number;
  endArrowY2: number;
  lastBlockId: string | null;
  draggingTargetId: string | null;
  onPointerDown: (e: React.PointerEvent, targetKey: string) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onInsertClick: (targetId: string, pos: "before" | "after") => void;
}

export function ProcessModelEndEndpoint({
  endId,
  showIds,
  endCx,
  endCy,
  endArrowX1,
  endArrowY1,
  endArrowX2,
  endArrowY2,
  lastBlockId,
  draggingTargetId,
  onPointerDown,
  onPointerUp,
  onInsertClick,
}: ProcessModelEndEndpointProps): ReactNode {
  const endKey = "end-event";
  const endMidX = (endArrowX1 + endArrowX2) / 2;
  const endMidY = (endArrowY1 + endArrowY2) / 2;

  return (
    <>
      <line
        key="arrow-end"
        x1={endArrowX1}
        y1={endArrowY1}
        x2={endArrowX2}
        y2={endArrowY2}
        stroke="var(--foreground, #23261f)"
        strokeWidth={1.5}
        markerEnd="url(#pm-arrow)"
      />

      {lastBlockId && (
        <g
          key="end-insert"
          className="ins"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => onInsertClick(lastBlockId, "after")}
        >
          <circle
            cx={endMidX}
            cy={endMidY}
            r={8}
            fill="var(--secondary, #ebe8e0)"
            stroke="var(--border, #ddd7c8)"
            strokeWidth={1}
          />
          <text
            x={endMidX}
            y={endMidY + 4}
            textAnchor="middle"
            fontSize={12}
            fontWeight={700}
            fill="var(--muted-foreground, #6f7266)"
            fontFamily="ui-monospace, monospace"
          >
            +
          </text>
          <title>Insert block here</title>
        </g>
      )}

      <g
        key={endKey}
        className={`node static ${draggingTargetId === endKey ? "dragging" : ""}`}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => onPointerDown(e, endKey)}
        onPointerUp={onPointerUp}
      >
        <circle
          cx={endCx}
          cy={endCy}
          r={17}
          fill="var(--card, #ffffff)"
          stroke="var(--foreground, #23261f)"
          strokeWidth={3}
        />
        {showIds && (
          <text
            x={endCx}
            y={endCy - 24}
            textAnchor="middle"
            fontSize={10}
            fill="var(--muted-foreground, #6f7266)"
            fontFamily="ui-monospace, monospace"
          >
            {endId}
          </text>
        )}
      </g>
    </>
  );
}
