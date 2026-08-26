"use client";

import { useState, useRef, type ChangeEvent, type DragEvent } from "react";
import { useTranslations } from "next-intl";
import { Upload, FileSpreadsheet, Check, AlertCircle, Layers } from "lucide-react";
import type { Block, Task } from "@/types";
import {
  parseGraphFile,
  graphToBlocksAndTasks,
  type RawGraphNodeRecord,
  type RawGraphEdgeRecord,
} from "@/services/xlsx";
import { useEditorStore } from "@/store/useEditorStore";
import {
  Button,
  Badge,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui";

export function ImportGraphDialog() {
  const t = useTranslations("diagram");
  const tBtn = useTranslations("common.buttons");
  const importBlocksAndTasks = useEditorStore((s) => s.importBlocksAndTasks);

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [loadedNodes, setLoadedNodes] = useState<RawGraphNodeRecord[]>([]);
  const [loadedEdges, setLoadedEdges] = useState<RawGraphEdgeRecord[]>([]);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [preview, setPreview] = useState<{
    blocks: Block[];
    tasks: Task[];
    warnings: string[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setLoadedNodes([]);
    setLoadedEdges([]);
    setFileNames([]);
    setPreview(null);
    setError(null);
    setBusy(false);
  };

  const processFiles = async (files: FileList | File[]) => {
    if (!files.length) return;
    setBusy(true);
    setError(null);

    let allNodes = [...loadedNodes];
    let allEdges = [...loadedEdges];
    const names: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]!;
        names.push(file.name);
        const result = await parseGraphFile(file);
        if (result.nodes?.length) {
          allNodes = result.nodes;
        }
        if (result.edges?.length) {
          allEdges = result.edges;
        }
      }

      setFileNames((prev) => Array.from(new Set([...prev, ...names])));
      setLoadedNodes(allNodes);
      setLoadedEdges(allEdges);

      if (allNodes.length > 0) {
        const generated = graphToBlocksAndTasks(allNodes, allEdges);
        setPreview(generated);
      } else {
        setError(t("nodesRequiredWarn"));
      }
    } catch (err) {
      setError(t("importErrorGeneric", { error: (err as Error).message }));
    } finally {
      setBusy(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleApply = () => {
    if (!preview) return;
    importBlocksAndTasks(preview.blocks, preview.tasks);
    setOpen(false);
    resetState();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetState();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs font-medium">
          <Upload className="size-3.5 mr-1.5" />
          {t("importGraph")}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <FileSpreadsheet className="size-4 text-primary" />
            {t("importGraphTitle")}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {t("importGraphDescription")}
          </DialogDescription>
        </DialogHeader>

        {/* Dropzone */}
        <div
          className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
            dragOver
              ? "border-primary bg-primary/5"
              : "border-border hover:border-muted-foreground/50 bg-muted/20"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFileChange}
          />
          <Upload className="size-8 text-muted-foreground mb-2 opacity-70" />
          <p className="text-xs font-semibold text-foreground mb-1">{t("dropFilesHere")}</p>
          <p className="text-[11px] text-muted-foreground max-w-sm">{t("dropFilesHint")}</p>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-xs text-destructive flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Selected files badge list */}
        {fileNames.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground font-medium">Files:</span>
            {fileNames.map((name, i) => (
              <Badge key={i} variant="secondary" className="font-mono text-[11px]">
                {name}
              </Badge>
            ))}
          </div>
        )}

        {/* Preview section */}
        {preview && (
          <div className="border rounded-lg p-4 bg-card space-y-3">
            <div className="flex items-center justify-between pb-2 border-b">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Layers className="size-3.5 text-primary" />
                {t("previewImportTitle")}
              </span>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] text-primary bg-primary/5"
                >
                  {t("nodesFound", { count: loadedNodes.length })}
                </Badge>
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] text-primary bg-primary/5"
                >
                  {t("edgesFound", { count: loadedEdges.length })}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded bg-muted/30 border">
                <span className="text-muted-foreground block text-[11px] uppercase tracking-wide">
                  Timesheet Tasks
                </span>
                <span className="font-mono font-semibold text-sm">
                  {t("tasksFound", { count: preview.tasks.length })}
                </span>
              </div>
              <div className="p-2.5 rounded bg-muted/30 border">
                <span className="text-muted-foreground block text-[11px] uppercase tracking-wide">
                  Process Steps
                </span>
                <span className="font-mono font-semibold text-sm">
                  {t("blocksGenerated", { count: preview.blocks.length })}
                </span>
              </div>
            </div>

            {/* Warnings if any */}
            {preview.warnings.length > 0 && (
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded text-[11px] text-amber-700 dark:text-amber-300">
                {preview.warnings.join(" ")}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            {tBtn("cancel")}
          </Button>
          <Button
            size="sm"
            disabled={!preview || busy}
            onClick={handleApply}
            className="bg-primary text-primary-foreground font-medium"
          >
            <Check className="size-3.5 mr-1.5" />
            {t("applyImport")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
