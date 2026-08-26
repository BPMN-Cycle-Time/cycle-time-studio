"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { Task } from "@/types";
import { AppSelect, type SelectOption } from "@/components/ui";
import { cn } from "@/utils";

const CUSTOM_VALUE = "__custom__";

interface TaskPickerProps {
  tasks: Task[];
  selectedTaskId?: string | null;
  onChange: (taskId: string | null) => void;
  className?: string;
}

export function TaskPicker({ tasks, selectedTaskId, onChange, className = "" }: TaskPickerProps) {
  const tEd = useTranslations("editor");
  const value = selectedTaskId || CUSTOM_VALUE;

  const options: SelectOption<string>[] = useMemo(
    () => [
      { value: CUSTOM_VALUE, label: tEd("customTime") },
      ...tasks.map((t) => ({ value: t.id, label: t.name })),
    ],
    [tasks, tEd],
  );

  const handleValueChange = (val: string) => {
    onChange(val === CUSTOM_VALUE ? null : val);
  };

  return (
    <AppSelect
      value={value}
      onValueChange={handleValueChange}
      options={options}
      placeholder={tEd("customTime")}
      triggerClassName={cn("min-w-[120px]", className)}
    />
  );
}
