"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, SlidersHorizontal, AlertTriangle } from "lucide-react";

import { calibrateModelFromLog, type CalibrationOptions } from "@/services/model-calibration";
import { useEditorStore } from "@/store/useEditorStore";
import {
  AppSelect,
  AppTooltip,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui";
import { CalibrationChangesTable } from "./calibration-changes-table";

type TimeStat = NonNullable<CalibrationOptions["timeStat"]>;

/**
 * "Calibrate from event log": previews task times, branch and loop probabilities measured on the
 * uploaded log and applies them in one undoable step (zundo history of the editor store).
 */
export function CalibrateFromLogDialog() {
  const t = useTranslations("diagram.calibration");
  const tBtn = useTranslations("common.buttons");
  const project = useEditorStore((s) => s.project);
  const importBlocksAndTasks = useEditorStore((s) => s.importBlocksAndTasks);

  const [open, setOpen] = useState(false);
  const [timeStat, setTimeStat] = useState<TimeStat>("median");

  const events = project?.uploadedEvents ?? null;
  const hasLog = Boolean(events?.length);
  const unit = project?.unit ?? "hours";

  const result = useMemo(() => {
    if (!open || !project || !events?.length) return null;
    return calibrateModelFromLog(project.blocks, project.tasks, events, { timeStat, unit });
  }, [open, project, events, timeStat, unit]);

  const handleApply = () => {
    if (!result) return;
    importBlocksAndTasks(result.blocks, result.tasks);
    setOpen(false);
  };

  const trigger = (
    <Button variant="outline" size="sm" className="h-8 text-xs font-medium" disabled={!hasLog}>
      <SlidersHorizontal className="size-3.5 mr-1.5" />
      {t("button")}
    </Button>
  );

  if (!hasLog) {
    return (
      <AppTooltip content={t("noLog")}>
        <span tabIndex={0}>{trigger}</span>
      </AppTooltip>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <SlidersHorizontal className="size-4 text-primary" />
            {t("title")}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {t("description", { count: events?.length ?? 0 })}
          </DialogDescription>
        </DialogHeader>

        <AppSelect<TimeStat>
          label={t("timeStat")}
          size="sm"
          value={timeStat}
          onValueChange={setTimeStat}
          wrapperClassName="max-w-[220px]"
          options={[
            { value: "median", label: t("median") },
            { value: "mean", label: t("mean") },
          ]}
        />

        {result && <CalibrationChangesTable changes={result.changes} unit={unit} />}

        {result && result.warnings.length > 0 && (
          <div className="flex gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
            <AlertTriangle className="size-4 shrink-0" />
            <ul className="flex flex-col gap-1">
              {result.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        <DialogFooter className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            {tBtn("cancel")}
          </Button>
          <Button size="sm" disabled={!result?.changes.length} onClick={handleApply}>
            <Check className="size-3.5 mr-1.5" />
            {t("apply")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
