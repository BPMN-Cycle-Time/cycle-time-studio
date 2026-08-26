"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { Wand2, Upload, Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui";

interface BpmnToolbarProps {
  busy: boolean;
  blockCount: number;
  onGenerateFromFlow: () => void;
  onImportFile: (file: File) => void;
  onExportFile: () => void;
  onPreviewSync: () => void;
}

export function BpmnToolbar({
  busy,
  blockCount,
  onGenerateFromFlow,
  onImportFile,
  onExportFile,
  onPreviewSync,
}: BpmnToolbarProps) {
  const t = useTranslations("diagram");
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-2 mb-3 flex-wrap">
      <Button
        variant="outline"
        size="sm"
        onClick={onGenerateFromFlow}
        disabled={busy || blockCount === 0}
      >
        <Wand2 /> {t("generateFromFlow")}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={busy}
      >
        <Upload /> {t("importBpmn")}
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".bpmn,.xml"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onImportFile(f);
          e.target.value = "";
        }}
      />
      <Button variant="outline" size="sm" onClick={onExportFile} disabled={busy}>
        <Download /> {t("exportBpmn")}
      </Button>
      <span className="flex-1" />
      <Button variant="secondary" size="sm" onClick={onPreviewSync} disabled={busy}>
        <RefreshCw /> {t("syncCalculator")}
      </Button>
    </div>
  );
}
