"use client";

import { useTranslations } from "next-intl";
import type { HeuristicsMinerOptions } from "@/types";
import { Label } from "@/components/ui";

interface DiscoverySettingsProps {
  options: HeuristicsMinerOptions;
  onChange: (options: HeuristicsMinerOptions) => void;
}

export function DiscoverySettings({ options, onChange }: DiscoverySettingsProps) {
  const t = useTranslations("diagram");

  const sliders: Array<{
    key: keyof HeuristicsMinerOptions;
    label: string;
    min: number;
    max: number;
    step: number;
  }> = [
    { key: "frequencyThreshold", label: t("thresholdFrequency"), min: 1, max: 10, step: 1 },
    { key: "dependencyThreshold", label: t("thresholdDependency"), min: 0, max: 1, step: 0.05 },
    { key: "loopThreshold", label: t("thresholdLoop"), min: 0, max: 1, step: 0.05 },
  ];

  return (
    <div className="space-y-4">
      {sliders.map(({ key, label, min, max, step }) => {
        const value = options[key] ?? min;
        return (
          <div key={key} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">{label}</Label>
              <span className="text-xs font-mono text-foreground">{value}</span>
            </div>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={value}
              onChange={(e) => onChange({ ...options, [key]: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>
        );
      })}
    </div>
  );
}
