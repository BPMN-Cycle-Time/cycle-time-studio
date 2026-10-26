"use client";

import { useTranslations } from "next-intl";

import type { WorkCalendar } from "@/types";
import { AppInput, AppLabel, Button, Switch } from "@/components/ui";
import { WorkCalendarDialog } from "./work-calendar-dialog";

interface PerformanceFiltersProps {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  workingHours: boolean;
  onWorkingHoursChange: (value: boolean) => void;
  calendar: WorkCalendar;
  onCalendarChange: (calendar: WorkCalendar) => void;
}

export function PerformanceFilters({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  workingHours,
  onWorkingHoursChange,
  calendar,
  onCalendarChange,
}: PerformanceFiltersProps) {
  const t = useTranslations("diagram.performance.filters");

  return (
    <div className="flex flex-wrap items-end gap-3">
      <AppInput
        type="date"
        label={t("from")}
        value={dateFrom}
        max={dateTo || undefined}
        onChange={(e) => onDateFromChange(e.target.value)}
        wrapperClassName="w-[160px]"
      />
      <AppInput
        type="date"
        label={t("to")}
        value={dateTo}
        min={dateFrom || undefined}
        onChange={(e) => onDateToChange(e.target.value)}
        wrapperClassName="w-[160px]"
      />
      {(dateFrom || dateTo) && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs"
          onClick={() => {
            onDateFromChange("");
            onDateToChange("");
          }}
        >
          {t("clearDates")}
        </Button>
      )}
      <span className="flex-1" />
      <div className="flex items-center gap-2 h-8">
        <AppLabel htmlFor="perf-working-hours" className="text-xs cursor-pointer">
          {workingHours ? t("workingHours") : t("calendarHours")}
        </AppLabel>
        <Switch
          id="perf-working-hours"
          checked={workingHours}
          onCheckedChange={onWorkingHoursChange}
        />
      </div>
      <WorkCalendarDialog calendar={calendar} onSave={onCalendarChange} />
    </div>
  );
}
