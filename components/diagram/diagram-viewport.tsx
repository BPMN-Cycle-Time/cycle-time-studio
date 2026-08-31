"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type ReactNode,
  type MouseEvent as ReactMouseEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { useTranslations } from "next-intl";
import { ZoomIn, ZoomOut, RotateCcw, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/utils";

interface DiagramViewportProps {
  children: ReactNode;
  contentWidth?: number;
  contentHeight?: number;
  className?: string;
  minZoom?: number;
  maxZoom?: number;
}

export function DiagramViewport({
  children,
  contentWidth,
  contentHeight,
  className = "",
  minZoom = 0.25,
  maxZoom = 3.0,
}: DiagramViewportProps) {
  const t = useTranslations("diagram");
  const containerRef = useRef<HTMLDivElement>(null);

  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const positionRef = useRef({ x: 0, y: 0 });

  // Sync ref
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  const clampZoom = useCallback(
    (newScale: number) => Math.min(maxZoom, Math.max(minZoom, Math.round(newScale * 100) / 100)),
    [minZoom, maxZoom],
  );

  const handleZoomIn = useCallback(() => {
    setScale((s) => clampZoom(s + 0.2));
  }, [clampZoom]);

  const handleZoomOut = useCallback(() => {
    setScale((s) => clampZoom(s - 0.2));
  }, [clampZoom]);

  const handleResetZoom = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleFitView = useCallback(() => {
    if (!containerRef.current || !contentWidth || !contentHeight) {
      handleResetZoom();
      return;
    }
    const containerW = containerRef.current.clientWidth - 48;
    const containerH = containerRef.current.clientHeight - 48;
    if (containerW <= 0 || containerH <= 0) return;

    const scaleX = containerW / contentWidth;
    const scaleY = containerH / contentHeight;
    const fitScale = clampZoom(Math.min(scaleX, scaleY, 1.2));
    setScale(fitScale);
    setPosition({ x: 0, y: 0 });
  }, [contentWidth, contentHeight, clampZoom, handleResetZoom]);

  // Wheel zoom handling
  const handleWheel = useCallback(
    (e: ReactWheelEvent<HTMLDivElement>) => {
      if (e.ctrlKey || e.metaKey || e.altKey) {
        e.preventDefault();
        const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;
        setScale((prevScale) => clampZoom(prevScale * zoomFactor));
      }
    },
    [clampZoom],
  );

  // Pointer/Mouse panning
  const handleMouseDown = useCallback((e: ReactMouseEvent<HTMLDivElement>) => {
    // Only pan on primary button and if target is not interactive button/input/select or draggable node/edge
    if (e.button !== 0) return;
    const target = e.target as HTMLElement | SVGElement;
    if (
      target.closest("button") ||
      target.closest("input") ||
      target.closest("select") ||
      target.closest("a") ||
      target.closest(".ins") ||
      target.closest(".node") ||
      target.closest(".gn-node") ||
      target.closest(".gnode") ||
      target.closest(".edge-handle") ||
      target.closest(".midpoint-handle") ||
      target.closest(".midpoint-handle-group") ||
      target.closest(".hit") ||
      target.closest(".pm-node") ||
      target.closest(".pm-interactive") ||
      target.closest(".pm-block") ||
      target.closest("[data-no-pan]") ||
      target.closest("g[class*='node']") ||
      target.closest("g[class*='hdl']") ||
      target.closest("g[class*='handle']")
    ) {
      return;
    }

    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - positionRef.current.x,
      y: e.clientY - positionRef.current.y,
    };
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
    },
    [isDragging],
  );

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
    }
  }, [isDragging]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const percentage = Math.round(scale * 100);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full h-full min-h-[480px] overflow-hidden select-none bg-card rounded-md border border-border/50",
        isDragging ? "cursor-grabbing" : "cursor-grab",
        className,
      )}
      style={{
        backgroundImage:
          "radial-gradient(var(--diagram-dot, rgba(0, 0, 0, 0.18)) 1.25px, transparent 1.25px)",
        backgroundSize: `${Math.max(10, Math.min(60, 18 * scale))}px ${Math.max(10, Math.min(60, 18 * scale))}px`,
        backgroundPosition: `${position.x}px ${position.y}px`,
      }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
    >
      {/* Zoomable Canvas Transform Layer */}
      <div
        className="w-full h-full flex items-center justify-center transition-transform duration-75 ease-out origin-center"
        style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})` }}
      >
        {children}
      </div>

      {/* Floating Zoom Controls Bar */}
      <div
        className="absolute bottom-1.5 right-1.5 z-20 flex items-center gap-1 bg-card/90 backdrop-blur-md border border-border/80 shadow-md rounded-lg p-1 transition-all"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground hover:text-foreground"
          onClick={handleZoomOut}
          title={t("zoomOut")}
          aria-label={t("zoomOut")}
        >
          <ZoomOut className="size-3.5" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 font-mono text-[11px] text-muted-foreground hover:text-foreground"
          onClick={handleResetZoom}
          title={t("zoomReset")}
        >
          {percentage}%
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground hover:text-foreground"
          onClick={handleZoomIn}
          title={t("zoomIn")}
          aria-label={t("zoomIn")}
        >
          <ZoomIn className="size-3.5" />
        </Button>

        <div className="w-px h-4 bg-border mx-0.5" />

        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground hover:text-foreground"
          onClick={handleFitView}
          title={t("fitView")}
          aria-label={t("fitView")}
        >
          <Maximize2 className="size-3.5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground hover:text-foreground"
          onClick={handleResetZoom}
          title={t("zoomReset")}
          aria-label={t("zoomReset")}
        >
          <RotateCcw className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
