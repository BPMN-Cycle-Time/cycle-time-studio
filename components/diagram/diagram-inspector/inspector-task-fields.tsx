"use client";

import { AppInput, AppSelect, type SelectOption } from "@/components/ui";

export const CUSTOM_VALUE = "__custom__";

interface InspectorTaskFieldsProps {
  taskId: string | null | undefined;
  duration: number | undefined;
  durationLabel: string;
  taskLabel: string;
  taskOptions: SelectOption<string>[];
  customOptionPlaceholder?: string;
  onTaskChange: (taskId: string | null) => void;
  onDurationChange: (duration: number) => void;
}

export function InspectorTaskFields({
  taskId,
  duration,
  durationLabel,
  taskLabel,
  taskOptions,
  customOptionPlaceholder,
  onTaskChange,
  onDurationChange,
}: InspectorTaskFieldsProps) {
  return (
    <>
      <AppSelect
        label={taskLabel}
        labelVariant="uppercase"
        value={taskId || CUSTOM_VALUE}
        onValueChange={(val) => {
          const newTaskId = val === CUSTOM_VALUE ? null : val;
          onTaskChange(newTaskId);
        }}
        options={taskOptions}
        placeholder={customOptionPlaceholder}
        triggerClassName="w-full"
      />

      {!taskId && (
        <AppInput
          label={durationLabel}
          labelVariant="uppercase"
          type="number"
          step="any"
          min={0}
          inputClassName="font-mono"
          value={duration ?? 1}
          onChange={(e) => onDurationChange(parseFloat(e.target.value) || 0)}
        />
      )}
    </>
  );
}
