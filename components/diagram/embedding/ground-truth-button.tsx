"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { FileCheck2, X } from "lucide-react";

import { parseGroundTruthCsv } from "@/services/graph-embedding";
import { Button } from "@/components/ui";

interface GroundTruthButtonProps {
  loaded: Record<string, string[]> | null;
  onLoad: (groundTruth: Record<string, string[]> | null) => void;
  onError: (message: string) => void;
}

/** Loads a ground-truth CSV (case_id, anomaly_types separated by ";"). */
export function GroundTruthButton({ loaded, onLoad, onError }: GroundTruthButtonProps) {
  const t = useTranslations("diagram.embedding.anomaly");
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
        <FileCheck2 className="size-3.5 mr-1.5" />
        {loaded
          ? t("groundTruthLoaded", { count: Object.keys(loaded).length })
          : t("loadGroundTruth")}
      </Button>
      {loaded && (
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label={t("clearGroundTruth")}
          onClick={() => onLoad(null)}
        >
          <X className="size-3.5" />
        </Button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          const parsed = parseGroundTruthCsv(await file.text());
          if (Object.keys(parsed).length) onLoad(parsed);
          else onError(t("groundTruthInvalid"));
        }}
      />
    </div>
  );
}
