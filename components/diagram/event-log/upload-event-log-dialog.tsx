"use client";

import { useState, useRef, type ChangeEvent, type DragEvent } from "react";
import { useTranslations } from "next-intl";
import { Upload, FileSpreadsheet, Check, AlertCircle, Layers } from "lucide-react";
import type { EventLogItem } from "@/types";
import { parseEventLogFile } from "@/services/event-log-parser";
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

interface UploadEventLogDialogProps {
  onImport: (events: EventLogItem[]) => void;
  trigger?: React.ReactNode;
}

export function UploadEventLogDialog({ onImport, trigger }: UploadEventLogDialogProps) {
  const tDiag = useTranslations("diagram");

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [parsedEvents, setParsedEvents] = useState<EventLogItem[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [fileSize, setFileSize] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setParsedEvents([]);
    setFileName("");
    setFileSize("");
    setError(null);
    setBusy(false);
  };

  const processFile = async (file: File) => {
    setBusy(true);
    setError(null);
    setFileName(file.name);
    setFileSize(`${(file.size / 1024).toFixed(1)} KB`);

    try {
      const items = await parseEventLogFile(file);
      if (items.length === 0) {
        setError(tDiag("emptyLogFileError"));
        setParsedEvents([]);
      } else {
        setParsedEvents(items);
      }
    } catch (err) {
      setError((err as Error).message || tDiag("uploadFileParseError"));
      setParsedEvents([]);
    } finally {
      setBusy(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleConfirmImport = () => {
    if (parsedEvents.length > 0) {
      onImport(parsedEvents);
      setOpen(false);
      resetState();
    }
  };

  // Preview stats
  const distinctCases = new Set(parsedEvents.map((e) => e.caseId)).size;
  const distinctActivities = new Set(parsedEvents.map((e) => e.activity)).size;
  const distinctResources = new Set(parsedEvents.map((e) => e.resource)).size;

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) resetState();
      }}
    >
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="text-xs flex items-center gap-1.5">
            <Upload className="w-3.5 h-3.5" />
            {tDiag("uploadLogButton")}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Upload className="w-4 h-4 text-primary" />
            {tDiag("uploadLogTitle")}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {tDiag("uploadLogDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
              dragOver
                ? "border-primary bg-primary/5"
                : "border-border/80 hover:border-border hover:bg-muted/30"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xes,.xml,.json"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="p-3 rounded-full bg-primary/10 text-primary">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-foreground">{tDiag("dropzonePrompt")}</p>
              <p className="text-xs text-muted-foreground">
                {tDiag("supportedFormats")} (.csv, .xes, .json)
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Parsed Preview */}
          {parsedEvents.length > 0 && (
            <div className="space-y-3 p-3.5 rounded-xl border border-border/70 bg-card/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-semibold text-foreground truncate max-w-[240px]">
                    {fileName}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">({fileSize})</span>
                </div>
                <Badge variant="secondary" className="text-xs font-mono">
                  {parsedEvents.length} {tDiag("totalEvents")}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-muted/40 border border-border/50">
                  <span className="text-muted-foreground block text-[11px] mb-0.5">
                    {tDiag("totalCases")}
                  </span>
                  <span className="font-bold text-foreground font-mono">{distinctCases}</span>
                </div>
                <div className="p-2 rounded-lg bg-muted/40 border border-border/50">
                  <span className="text-muted-foreground block text-[11px] mb-0.5">
                    {tDiag("distinctActivities")}
                  </span>
                  <span className="font-bold text-foreground font-mono">{distinctActivities}</span>
                </div>
                <div className="p-2 rounded-lg bg-muted/40 border border-border/50">
                  <span className="text-muted-foreground block text-[11px] mb-0.5">
                    {tDiag("distinctResources")}
                  </span>
                  <span className="font-bold text-foreground font-mono">{distinctResources}</span>
                </div>
              </div>

              {/* Sample Preview Rows */}
              <div className="text-[11px] text-muted-foreground">
                <div className="flex items-center gap-1 mb-1 font-medium">
                  <Layers className="w-3 h-3" />
                  <span>{tDiag("previewSampleRows")}:</span>
                </div>
                <div className="max-h-28 overflow-y-auto rounded border border-border/50 bg-background/60 font-mono text-[11px] p-2 space-y-1">
                  {parsedEvents.slice(0, 4).map((row, idx) => (
                    <div key={idx} className="truncate text-muted-foreground">
                      <span className="text-foreground font-semibold">[{row.caseId}]</span>{" "}
                      {row.activity} • <span className="text-primary">{row.resource}</span> •{" "}
                      {row.duration}h
                    </div>
                  ))}
                  {parsedEvents.length > 4 && (
                    <div className="text-muted-foreground italic">
                      ... +{parsedEvents.length - 4} {tDiag("moreEvents")}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            {tDiag("cancel")}
          </Button>
          <Button
            size="sm"
            onClick={handleConfirmImport}
            disabled={parsedEvents.length === 0 || busy}
            className="flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            {tDiag("confirmImport")} ({parsedEvents.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
