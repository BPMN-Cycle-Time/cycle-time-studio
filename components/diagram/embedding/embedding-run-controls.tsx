"use client";

import { useTranslations } from "next-intl";
import { Loader2, Play, Square } from "lucide-react";

import { Button } from "@/components/ui";

interface EmbeddingRunControlsProps {
  running: boolean;
  onRun: () => void;
  onCancel: () => void;
  disabled?: boolean;
  runLabel?: string;
  hint?: string;
  error?: string | null;
}

/** Run / cancel buttons for a background (Web Worker) embedding job. */
export function EmbeddingRunControls({
  running,
  onRun,
  onCancel,
  disabled,
  runLabel,
  hint,
  error,
}: EmbeddingRunControlsProps) {
  const t = useTranslations("diagram.embedding");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" onClick={onRun} disabled={running || disabled}>
        {running ? (
          <Loader2 className="size-3.5 mr-1.5 animate-spin" />
        ) : (
          <Play className="size-3.5 mr-1.5" />
        )}
        {running ? t("running") : (runLabel ?? t("run"))}
      </Button>
      {running && (
        <Button variant="outline" size="sm" onClick={onCancel}>
          <Square className="size-3.5 mr-1.5" />
          {t("cancel")}
        </Button>
      )}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      {error && <span className="text-xs text-destructive">{t("error", { message: error })}</span>}
    </div>
  );
}
