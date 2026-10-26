"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CalendarClock, Plus, Trash2 } from "lucide-react";

import type { WorkCalendar, WorkCalendarBlock } from "@/types";
import { parseClock } from "@/services/work-calendar";
import {
  AppInput,
  AppLabel,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui";

/** Monday-first display order of JS weekdays (0 = Sunday). */
const WEEKDAYS = [1, 2, 3, 4, 5, 6, 0] as const;

interface WorkCalendarDialogProps {
  calendar: WorkCalendar;
  onSave: (calendar: WorkCalendar) => void;
}

export function WorkCalendarDialog({ calendar, onSave }: WorkCalendarDialogProps) {
  const t = useTranslations("diagram.performance.calendar");
  const tBtn = useTranslations("common.buttons");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<WorkCalendar>(calendar);

  const blockValid = (b: WorkCalendarBlock): boolean => {
    const s = parseClock(b.start);
    const e = parseClock(b.end);
    return s !== null && e !== null && e > s;
  };
  const valid =
    draft.workDays.length > 0 && draft.blocks.length > 0 && draft.blocks.every(blockValid);

  const toggleDay = (day: number, on: boolean) =>
    setDraft((d) => ({
      ...d,
      workDays: on ? [...d.workDays, day].sort() : d.workDays.filter((x) => x !== day),
    }));
  const updateBlock = (idx: number, patch: Partial<WorkCalendarBlock>) =>
    setDraft((d) => ({
      ...d,
      blocks: d.blocks.map((b, i) => (i === idx ? { ...b, ...patch } : b)),
    }));

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setDraft(calendar);
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs font-medium">
          <CalendarClock className="size-3.5 mr-1.5" />
          {t("configure")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">{t("title")}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {t("description")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <AppLabel className="text-xs">{t("workDays")}</AppLabel>
          <div className="flex flex-wrap gap-3">
            {WEEKDAYS.map((day) => (
              <div key={day} className="flex items-center gap-1.5">
                <Checkbox
                  id={`workday-${day}`}
                  checked={draft.workDays.includes(day)}
                  onCheckedChange={(c) => toggleDay(day, c === true)}
                />
                <AppLabel htmlFor={`workday-${day}`} className="text-xs cursor-pointer">
                  {t(`days.${day}`)}
                </AppLabel>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <AppLabel className="text-xs">{t("blocks")}</AppLabel>
          {draft.blocks.map((block, idx) => (
            <div key={idx} className="flex items-end gap-2">
              <AppInput
                type="time"
                label={t("from")}
                value={block.start}
                onChange={(e) => updateBlock(idx, { start: e.target.value })}
                error={blockValid(block) ? undefined : t("invalidBlock")}
              />
              <AppInput
                type="time"
                label={t("to")}
                value={block.end}
                onChange={(e) => updateBlock(idx, { end: e.target.value })}
              />
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground"
                aria-label={t("removeBlock")}
                onClick={() =>
                  setDraft((d) => ({ ...d, blocks: d.blocks.filter((_, i) => i !== idx) }))
                }
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="w-fit h-8 text-xs"
            onClick={() =>
              setDraft((d) => ({ ...d, blocks: [...d.blocks, { start: "09:00", end: "17:00" }] }))
            }
          >
            <Plus className="size-3.5 mr-1.5" />
            {t("addBlock")}
          </Button>
        </div>

        <DialogFooter className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            {tBtn("cancel")}
          </Button>
          <Button
            size="sm"
            disabled={!valid}
            onClick={() => {
              onSave(draft);
              setOpen(false);
            }}
          >
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
