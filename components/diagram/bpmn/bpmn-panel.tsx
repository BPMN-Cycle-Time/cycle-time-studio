"use client";

import "bpmn-js/dist/assets/diagram-js.css";
import "bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css";
import "bpmn-js/dist/assets/bpmn-js.css";
import "./bpmn-panel.css";

import { useEffect, useRef, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { ZoomIn, ZoomOut, RotateCcw, Maximize2 } from "lucide-react";
import type Modeler from "bpmn-js/lib/Modeler";

import type { Block, Task } from "@/types";
import {
  blocksToBpmnXml,
  bpmnXmlToBlocks,
  exportSvgToPng,
  slugify,
  type BpmnImportResult,
} from "@/utils";
import { EMPTY_DIAGRAM } from "@/constants";
import { Button } from "@/components/ui";
import { useEditorStore } from "@/store/useEditorStore";
import { BpmnToolbar } from "./bpmn-toolbar";
import { BpmnPreviewCard } from "./bpmn-preview-card";

interface CanvasService {
  zoom: (val?: string | number, point?: string | { x: number; y: number }) => number;
  viewbox: () => {
    x: number;
    y: number;
    width: number;
    height: number;
    scale: number;
    inner: { width: number; height: number; x: number; y: number };
  };
  scroll: (delta: { dx: number; dy: number }) => void;
  resized: () => void;
}

export function BpmnPanel({
  blocks,
  tasks,
  unit,
}: {
  blocks: Block[];
  tasks?: Task[];
  unit: string;
}) {
  const t = useTranslations("diagram");
  const importBlocksAndTasks = useEditorStore((s) => s.importBlocksAndTasks);
  const containerRef = useRef<HTMLDivElement>(null);
  const modelerRef = useRef<Modeler | null>(null);
  const lastXmlRef = useRef<string>("");

  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<BpmnImportResult | null>(null);
  const [zoomPercent, setZoomPercent] = useState(100);

  const fitAndCenterDiagram = useCallback((modeler: Modeler) => {
    const executeFit = () => {
      try {
        const canvas = modeler.get("canvas") as CanvasService;
        if (canvas && containerRef.current && containerRef.current.clientWidth > 0) {
          canvas.resized?.();
          canvas.zoom("fit-viewport", "auto");
          const current = canvas.zoom();
          if (typeof current === "number") {
            setZoomPercent(Math.round(current * 100));
          }
        }
      } catch {
        // ignore
      }
    };

    // Multi-frame settling to guarantee centering after CSS & DOM rendering
    executeFit();
    requestAnimationFrame(executeFit);
    setTimeout(executeFit, 60);
    setTimeout(executeFit, 180);
  }, []);

  // Initialize modeler once on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ default: Modeler }, { CreateAppendAnythingModule }] = await Promise.all([
        import("bpmn-js/lib/Modeler"),
        import("bpmn-js-create-append-anything"),
      ]);
      if (cancelled || !containerRef.current) return;
      const modeler = new Modeler({
        container: containerRef.current,
        additionalModules: [CreateAppendAnythingModule],
      });
      modelerRef.current = modeler;

      // Listen to zoom / viewbox updates
      modeler.on("canvas.viewbox.changed", () => {
        try {
          const canvas = modeler.get("canvas") as CanvasService;
          const z = canvas?.zoom();
          if (typeof z === "number") {
            setZoomPercent(Math.round(z * 100));
          }
        } catch {
          // ignore
        }
      });

      try {
        const xml = blocks.length ? await blocksToBpmnXml(blocks, "Process", tasks) : EMPTY_DIAGRAM;
        lastXmlRef.current = xml;
        await modeler.importXML(xml);
        fitAndCenterDiagram(modeler);
      } catch {
        setStatus(t("status.loadError"));
      }
    })();

    return () => {
      cancelled = true;
      modelerRef.current?.destroy();
      modelerRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ResizeObserver to re-center when tab becomes visible or container resizes
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => {
      if (modelerRef.current && containerRef.current && containerRef.current.clientWidth > 0) {
        fitAndCenterDiagram(modelerRef.current);
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [fitAndCenterDiagram]);

  const handleGenerateFromFlow = useCallback(async () => {
    if (!modelerRef.current || blocks.length === 0) return;
    setBusy(true);
    setStatus("");
    try {
      const xml = await blocksToBpmnXml(blocks, "Process", tasks);
      lastXmlRef.current = xml;
      await modelerRef.current.importXML(xml);
      fitAndCenterDiagram(modelerRef.current);
      setStatus(t("status.generated"));
    } catch {
      setStatus(t("status.generateFailed"));
    } finally {
      setBusy(false);
    }
  }, [blocks, tasks, fitAndCenterDiagram, t]);

  const handleImportFile = useCallback(
    async (file: File) => {
      if (!modelerRef.current) return;
      setBusy(true);
      setStatus("");
      try {
        const xml = await file.text();
        lastXmlRef.current = xml;
        await modelerRef.current.importXML(xml);
        fitAndCenterDiagram(modelerRef.current);

        // Immediately sync blocks & generated timesheet tasks to global store
        const parsed = await bpmnXmlToBlocks(xml, tasks);
        importBlocksAndTasks(parsed.blocks, parsed.tasks);

        setStatus(t("status.loadedFile", { name: file.name }));
      } catch {
        setStatus(t("status.loadFileFailed"));
      } finally {
        setBusy(false);
      }
    },
    [fitAndCenterDiagram, importBlocksAndTasks, tasks, t],
  );

  const projectName = useEditorStore((s) => s.project?.name);

  const handleExportFile = useCallback(async () => {
    if (!modelerRef.current) return;
    setBusy(true);
    try {
      const result = await modelerRef.current.saveXML({ format: true });
      const xml = result.xml || "";
      const blob = new Blob([xml], { type: "application/xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slugify(projectName)}-process.bpmn`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus(t("status.exported"));
    } catch {
      setStatus(t("status.exportFailed"));
    } finally {
      setBusy(false);
    }
  }, [projectName, t]);

  const handleExportPng = useCallback(async () => {
    if (!modelerRef.current) return;
    setBusy(true);
    try {
      const result = await modelerRef.current.saveSVG();
      const svg = result.svg || "";
      const fileName = `${slugify(projectName)}-bpmn.png`;
      await exportSvgToPng(svg, fileName);
      setStatus(t("status.exportedPng"));
    } catch {
      setStatus(t("status.exportPngFailed"));
    } finally {
      setBusy(false);
    }
  }, [projectName, t]);

  const handlePreviewSync = useCallback(async () => {
    if (!modelerRef.current) return;
    setBusy(true);
    setStatus("");
    try {
      const result = await modelerRef.current.saveXML({ format: true });
      const xml = result.xml || "";
      const parsed = await bpmnXmlToBlocks(xml, tasks);
      setPreview(parsed);
      setStatus(
        t("status.parsedPreview", {
          blocks: parsed.blocks.length,
          warnings: parsed.warnings.length,
        }),
      );
    } catch {
      setStatus(t("status.parseFailed"));
    } finally {
      setBusy(false);
    }
  }, [tasks, t]);

  const handleApplyPreview = useCallback(
    (appliedBlocks: Block[], appliedTasks?: Task[]) => {
      const finalTasks = appliedTasks || preview?.tasks || tasks || [];
      importBlocksAndTasks(appliedBlocks, finalTasks);
      setPreview(null);
      setStatus(t("status.appliedToCalc", { count: appliedBlocks.length }));
    },
    [importBlocksAndTasks, preview?.tasks, tasks, t],
  );

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    if (!modelerRef.current) return;
    const canvas = modelerRef.current.get("canvas") as CanvasService;
    const current = canvas.zoom();
    canvas.zoom(Math.min(3.0, current + 0.2), "auto");
  }, []);

  const handleZoomOut = useCallback(() => {
    if (!modelerRef.current) return;
    const canvas = modelerRef.current.get("canvas") as CanvasService;
    const current = canvas.zoom();
    canvas.zoom(Math.max(0.2, current - 0.2), "auto");
  }, []);

  const handleResetZoom = useCallback(() => {
    if (!modelerRef.current) return;
    const canvas = modelerRef.current.get("canvas") as CanvasService;
    canvas.zoom(1.0, "auto");
  }, []);

  const handleFitView = useCallback(() => {
    if (!modelerRef.current) return;
    fitAndCenterDiagram(modelerRef.current);
  }, [fitAndCenterDiagram]);

  return (
    <div className="w-full flex-1 flex flex-col gap-4">
      <BpmnToolbar
        busy={busy}
        blockCount={blocks.length}
        onGenerateFromFlow={handleGenerateFromFlow}
        onImportFile={handleImportFile}
        onExportFile={handleExportFile}
        onExportPng={handleExportPng}
        onPreviewSync={handlePreviewSync}
      />

      <div className="relative border rounded-lg bg-card shadow-sm w-full flex flex-col h-[560px] lg:h-[620px] shrink-0 overflow-hidden">
        <div ref={containerRef} className="bpmn-canvas flex-1 w-full h-full" />

        {/* Floating Zoom Controls Bar */}
        <div
          className="absolute bottom-4 right-4 z-20 flex items-center gap-1 bg-card/90 backdrop-blur-md border border-border/80 shadow-md rounded-lg p-1 transition-all"
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
            {zoomPercent}%
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

          <div className="w-[1px] h-4 bg-border mx-0.5" />

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

      {status && <div className="text-xs text-muted-foreground mt-2">{status}</div>}

      {preview && (
        <BpmnPreviewCard
          preview={preview}
          unit={unit}
          onApply={handleApplyPreview}
          onDiscard={() => setPreview(null)}
        />
      )}
    </div>
  );
}
