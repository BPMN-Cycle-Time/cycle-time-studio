"use client";

import { useTranslations } from "next-intl";
import type { Task } from "@/types";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui";
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

  const handleValueChange = (val: string) => {
    onChange(val === CUSTOM_VALUE ? null : val);
  };

  return (
    <Select value={value} onValueChange={handleValueChange}>
      <SelectTrigger size="sm" className={cn("h-8 text-xs font-medium min-w-[120px]", className)}>
        <SelectValue placeholder={tEd("customTime")} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={CUSTOM_VALUE} className="text-xs">
          {tEd("customTime")}
        </SelectItem>
        {tasks.map((t) => (
          <SelectItem key={t.id} value={t.id} className="text-xs">
            {t.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
