import type { ReactNode } from "react";
import { wrapLabel, GW } from "@/services/graph";

export function renderTaskBox(
  key: string,
  x: number,
  top: number,
  w: number,
  h: number,
  label: string,
  strokeColor: string,
  fillColor: string,
  subtitle: string,
  gid: string,
  showIds: boolean,
  isSelected: boolean,
  isDragging?: boolean,
  onPointerDown?: (e: React.PointerEvent) => void,
  onPointerUp?: (e: React.PointerEvent) => void,
): ReactNode {
  const lines = wrapLabel(label, 16);
  const lineH = 15;
  const cy = top + h / 2;
  const startY = cy - ((lines.length - 1) * lineH) / 2 + 4;

  return (
    <g
      key={key}
      className={`node ${isSelected ? "sel" : ""} ${isDragging ? "dragging" : ""}`}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      <rect
        className="halo"
        x={x - 5}
        y={top - 5}
        width={w + 10}
        height={h + 10}
        rx={13}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.2}
        strokeDasharray="3 3"
        opacity={0.7}
      />
      <rect
        x={x}
        y={top}
        width={w}
        height={h}
        rx={9}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={1.6}
      />
      {lines.map((line, i) => (
        <text
          key={i}
          x={x + w / 2}
          y={startY + i * lineH}
          textAnchor="middle"
          fontSize={12}
          fontWeight={500}
          fill="var(--foreground, #23261f)"
        >
          {line}
        </text>
      ))}
      {subtitle && (
        <text
          x={x + w / 2}
          y={top + h - 6}
          textAnchor="middle"
          fontSize={9.5}
          fill={strokeColor}
          fontFamily="ui-monospace, monospace"
        >
          {subtitle}
        </text>
      )}
      {showIds && gid && (
        <>
          <rect
            x={x + 5}
            y={top + 4}
            width={13 + gid.length * 4.5}
            height={13}
            rx={4}
            fill="var(--card, #ffffff)"
            opacity={0.85}
          />
          <text
            x={x + 11}
            y={top + 14}
            textAnchor="start"
            fontSize={9.5}
            fill="var(--muted-foreground, #6f7266)"
            fontFamily="ui-monospace, monospace"
          >
            {gid}
          </text>
        </>
      )}
    </g>
  );
}

export function renderGatewayDiamond(
  key: string,
  cx: number,
  cy: number,
  symbol: string,
  strokeColor: string,
  gid: string,
  showIds: boolean,
  isSelected: boolean,
  isDragging?: boolean,
  onPointerDown?: (e: React.PointerEvent) => void,
  onPointerUp?: (e: React.PointerEvent) => void,
): ReactNode {
  const h = GW / 2;
  const points = `${cx},${cy - h} ${cx + h},${cy} ${cx},${cy + h} ${cx - h},${cy}`;

  return (
    <g
      key={key}
      className={`node ${isSelected ? "sel" : ""} ${isDragging ? "dragging" : ""}`}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      <circle
        className="halo"
        cx={cx}
        cy={cy}
        r={h + 6}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.2}
        strokeDasharray="3 3"
        opacity={0.7}
      />
      <polygon points={points} fill="var(--card, #ffffff)" stroke={strokeColor} strokeWidth={1.8} />
      <text
        x={cx}
        y={cy + 5}
        textAnchor="middle"
        fontSize={14}
        fontWeight={700}
        fill={strokeColor}
        fontFamily="ui-monospace, monospace"
      >
        {symbol}
      </text>
      {showIds && gid && (
        <text
          x={cx}
          y={cy - h - 6}
          textAnchor="middle"
          fontSize={9.5}
          fill="var(--muted-foreground, #6f7266)"
          fontFamily="ui-monospace, monospace"
        >
          {gid}
        </text>
      )}
    </g>
  );
}

export function renderBranchBadge(
  branchId: string,
  labelX: number,
  labelY: number,
  caption: string,
  strokeColor: string,
  isXor: boolean,
): ReactNode {
  const badgeW = caption.length * 6.6 + 14;
  const badgeH = 17;
  return (
    <g key={`caption-${branchId}`} className="branch-label-badge">
      <rect
        x={labelX}
        y={labelY - 13}
        width={badgeW}
        height={badgeH}
        rx={4}
        fill="var(--card, #ffffff)"
        stroke={strokeColor}
        strokeWidth={1}
        opacity={0.96}
      />
      <text
        x={labelX + badgeW / 2}
        y={labelY - 1}
        textAnchor="middle"
        fontSize={10.5}
        fontWeight={600}
        fill={strokeColor}
        fontFamily={isXor ? "ui-monospace, monospace" : "inherit"}
      >
        {caption}
      </text>
    </g>
  );
}
