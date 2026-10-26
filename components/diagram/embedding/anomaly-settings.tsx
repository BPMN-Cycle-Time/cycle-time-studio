"use client";

import { useTranslations } from "next-intl";

import type { TraceEmbeddingMethod, TraceEmbeddingSettings, TraceLabelMode } from "@/types";
import { AppSelect } from "@/components/ui";
import { EmbeddingNumberField } from "./embedding-number-field";

interface AnomalySettingsProps {
  settings: TraceEmbeddingSettings;
  onChange: (settings: TraceEmbeddingSettings) => void;
  mode: TraceLabelMode;
  onModeChange: (mode: TraceLabelMode) => void;
  attributeKeys: string[];
}

export function AnomalySettings({
  settings,
  onChange,
  mode,
  onModeChange,
  attributeKeys,
}: AnomalySettingsProps) {
  const t = useTranslations("diagram.embedding.anomaly");
  const g2v = settings.graph2vec;
  const setG2v = (key: "dimensions" | "epochs" | "seed") => (value: number) =>
    onChange({ ...settings, graph2vec: { ...g2v, [key]: value } });

  return (
    <div className="flex flex-wrap items-end gap-3">
      <AppSelect<TraceEmbeddingMethod>
        label={t("method")}
        size="sm"
        value={settings.method}
        onValueChange={(method) => onChange({ ...settings, method })}
        options={[
          { value: "graph2vec", label: t("methodGraph2vec") },
          { value: "wlKernel", label: t("methodWlKernel") },
        ]}
        wrapperClassName="w-[190px]"
      />
      <AppSelect<TraceLabelMode>
        label={t("labelMode")}
        size="sm"
        value={mode}
        onValueChange={onModeChange}
        options={[
          { value: "structure", label: t("modes.structure") },
          { value: "timeAware", label: t("modes.timeAware") },
          {
            value: "timeAndAttributes",
            label: t("modes.timeAndAttributes"),
            disabled: !attributeKeys.length,
          },
        ]}
        wrapperClassName="w-[190px]"
      />
      <AppSelect
        label={t("attribute")}
        size="sm"
        value={settings.attributeKeys[0] ?? ""}
        onValueChange={(key) => onChange({ ...settings, attributeKeys: [key] })}
        options={attributeKeys.map((k) => ({ value: k, label: k }))}
        disabled={!attributeKeys.length}
        placeholder={t("noAttributes")}
        wrapperClassName="w-[170px]"
      />
      <EmbeddingNumberField
        label={t("k")}
        value={settings.k}
        onChange={(k) => onChange({ ...settings, k })}
        min={1}
        max={100}
      />
      <EmbeddingNumberField
        label={t("slowQuantile")}
        value={settings.slowQuantile}
        onChange={(slowQuantile) => onChange({ ...settings, slowQuantile })}
        min={0.5}
        max={0.99}
        step={0.05}
      />
      {settings.method === "graph2vec" && (
        <>
          <EmbeddingNumberField
            label={t("dimensions")}
            value={g2v.dimensions ?? 32}
            onChange={setG2v("dimensions")}
            min={2}
            max={128}
          />
          <EmbeddingNumberField
            label={t("epochs")}
            value={g2v.epochs ?? 200}
            onChange={setG2v("epochs")}
            min={1}
            max={1000}
          />
          <EmbeddingNumberField
            label={t("seed")}
            value={g2v.seed ?? 42}
            onChange={setG2v("seed")}
            min={0}
          />
        </>
      )}
    </div>
  );
}
