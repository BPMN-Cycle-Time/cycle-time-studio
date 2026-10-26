"use client";

import { AppInput } from "@/components/ui";

interface EmbeddingNumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

/** Compact labelled numeric input; ignores non-numeric edits. */
export function EmbeddingNumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
}: EmbeddingNumberFieldProps) {
  return (
    <AppInput
      type="number"
      label={label}
      value={Number.isFinite(value) ? value : ""}
      min={min}
      max={max}
      step={step}
      onChange={(e) => {
        const next = Number(e.target.value);
        if (e.target.value !== "" && Number.isFinite(next)) onChange(next);
      }}
      wrapperClassName="w-[120px]"
    />
  );
}
