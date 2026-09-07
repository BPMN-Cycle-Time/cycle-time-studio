"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { RotateCcw, CheckCircle2, AlertCircle } from "lucide-react";
import type { TaskBenchmarkSummary } from "@/types";
import {
  Badge,
  Button,
  Input,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui";
import { cleanTaskName, formatDisplayTaskId } from "@/utils";

interface TaskBenchmarkTableProps {
  taskSummaries: TaskBenchmarkSummary[];
  unit: string;
  onBenchmarkChange?: (taskId: string, newBenchmark: number) => void;
  onResetBenchmarks?: () => void;
  hasCustomBenchmarks?: boolean;
}

export function TaskBenchmarkTable({
  taskSummaries,
  unit,
  onBenchmarkChange,
  onResetBenchmarks,
  hasCustomBenchmarks = false,
}: TaskBenchmarkTableProps) {
  const tDiag = useTranslations("diagram");

  // Editing state for inline benchmark modification: { [taskId]: stringValue }
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});

  const handleInputChange = (taskId: string, val: string) => {
    setEditingValues((prev) => ({ ...prev, [taskId]: val }));
  };

  const handleApplyBenchmark = (taskId: string) => {
    const rawVal = editingValues[taskId];
    if (rawVal !== undefined) {
      const num = parseFloat(rawVal);
      if (!isNaN(num) && num > 0) {
        onBenchmarkChange?.(taskId, num);
      }
    }
  };

  // Compute overall summary totals
  const totals = useMemo(() => {
    const totalInstances = taskSummaries.reduce((acc, t) => acc + t.totalInstances, 0);
    const totalMet = taskSummaries.reduce((acc, t) => acc + t.metCount, 0);
    const totalDelayed = taskSummaries.reduce((acc, t) => acc + t.delayedCount, 0);
    const overallRate =
      totalInstances > 0 ? Math.round((totalMet / totalInstances) * 1000) / 10 : 100;
    return { totalInstances, totalMet, totalDelayed, overallRate };
  }, [taskSummaries]);

  return (
    <div className="flex flex-col gap-2.5 w-full">
      {/* Table Toolbar / Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap px-1">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold capitalize tracking-wider text-foreground flex items-center gap-1.5">
            {tDiag("slaEvaluationTitle")}
          </h3>
          <Badge variant="outline" className="text-[11px] font-mono">
            {taskSummaries.length} {tDiag("stepsCount")}
          </Badge>
        </div>

        {hasCustomBenchmarks && onResetBenchmarks && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetBenchmarks}
            className="h-7 text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="w-3 h-3" />
            {tDiag("resetBenchmarks")}
          </Button>
        )}
      </div>

      {/* Table Container */}
      <div className="rounded-xl border border-border/70 overflow-hidden bg-card shadow-xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/70">
              <TableHead className="text-xs font-semibold text-muted-foreground py-2.5 px-3 min-w-[90px]">
                {tDiag("colTaskId")}
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground py-2.5 px-3 min-w-[160px]">
                {tDiag("colTaskName")}
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground py-2.5 px-3 text-right min-w-[140px]">
                {tDiag("colBenchmarkDuration", { unit })}
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground py-2.5 px-3 text-center min-w-[100px]">
                {tDiag("colTotalInstances")}
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground py-2.5 px-3 text-center min-w-[110px]">
                {tDiag("colMetCount")}
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground py-2.5 px-3 text-center min-w-[110px]">
                {tDiag("colDelayedCount")}
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground py-2.5 px-3 text-right min-w-[130px]">
                {tDiag("colComplianceRate")}
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {taskSummaries.map((summary, index) => {
              const currentInputVal =
                editingValues[summary.taskId] ?? String(summary.benchmarkDuration);
              const isRateHigh = summary.complianceRate >= 80;
              const isRateLow = summary.complianceRate < 50;

              return (
                <TableRow
                  key={summary.taskId}
                  className="hover:bg-muted/30 transition-colors border-b border-border/50"
                >
                  {/* Task ID */}
                  <TableCell className="py-2.5 px-3 font-mono text-xs font-semibold">
                    <Badge
                      variant="outline"
                      className="bg-muted/50 font-mono text-xs font-bold"
                      title={summary.taskId}
                    >
                      {formatDisplayTaskId(summary.taskId, index)}
                    </Badge>
                  </TableCell>

                  {/* Task Name */}
                  <TableCell className="py-2.5 px-3 text-xs font-medium text-foreground">
                    {cleanTaskName(summary.taskName)}
                  </TableCell>

                  {/* Benchmark Duration (Editable) */}
                  <TableCell className="py-2.5 px-3 text-right">
                    <div className="inline-flex items-center justify-end gap-1">
                      <Input
                        type="number"
                        step="any"
                        min="0.1"
                        value={currentInputVal}
                        onChange={(e) => handleInputChange(summary.taskId, e.target.value)}
                        onBlur={() => handleApplyBenchmark(summary.taskId)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleApplyBenchmark(summary.taskId);
                          }
                        }}
                        className="w-16 h-7 text-xs text-right font-mono px-1.5 py-0.5 bg-background border-border/60"
                        title={tDiag("editBenchmark")}
                      />
                      <span className="text-[11px] text-muted-foreground font-mono">{unit}</span>
                    </div>
                  </TableCell>

                  {/* Total Instances */}
                  <TableCell className="py-2.5 px-3 text-center font-mono text-xs font-medium">
                    {summary.totalInstances}
                  </TableCell>

                  {/* Met Count */}
                  <TableCell className="py-2.5 px-3 text-center font-mono text-xs">
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3 h-3" />
                      {summary.metCount}
                    </span>
                  </TableCell>

                  {/* Delayed Count */}
                  <TableCell className="py-2.5 px-3 text-center font-mono text-xs">
                    {summary.delayedCount > 0 ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400">
                        <AlertCircle className="w-3 h-3" />
                        {summary.delayedCount}
                      </span>
                    ) : (
                      <span className="text-muted-foreground font-mono">0</span>
                    )}
                  </TableCell>

                  {/* Compliance Rate with mini progress bar */}
                  <TableCell className="py-2.5 px-3 text-right font-mono text-xs">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden hidden sm:block">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isRateHigh
                              ? "bg-emerald-500"
                              : isRateLow
                                ? "bg-rose-500"
                                : "bg-amber-500"
                          }`}
                          style={{ width: `${summary.complianceRate}%` }}
                        />
                      </div>
                      <Badge
                        variant={isRateHigh ? "secondary" : isRateLow ? "destructive" : "outline"}
                        className={`font-mono text-xs font-bold px-1.5 py-0 ${
                          isRateHigh
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                            : isRateLow
                              ? ""
                              : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                        }`}
                      >
                        {summary.complianceRate.toFixed(1)}%
                      </Badge>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}

            {/* Total Row (Highlighted like Image 3) */}
            <TableRow className="bg-primary/5 dark:bg-primary/10 hover:bg-primary/10 border-t-2 border-primary/20 font-semibold">
              <TableCell className="py-3 px-3 font-bold text-xs text-foreground tracking-wide">
                {tDiag("totalRow")}
              </TableCell>
              <TableCell className="py-3 px-3 text-xs text-muted-foreground italic">—</TableCell>
              <TableCell className="py-3 px-3 text-right text-xs text-muted-foreground italic">
                —
              </TableCell>
              <TableCell className="py-3 px-3 text-center font-mono text-xs font-bold text-foreground">
                {totals.totalInstances}
              </TableCell>
              <TableCell className="py-3 px-3 text-center font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {totals.totalMet}
              </TableCell>
              <TableCell className="py-3 px-3 text-center font-mono text-xs font-bold text-rose-600 dark:text-rose-400">
                {totals.totalDelayed}
              </TableCell>
              <TableCell className="py-3 px-3 text-right font-mono text-xs font-bold">
                <Badge
                  variant={totals.overallRate >= 80 ? "secondary" : "destructive"}
                  className="font-mono text-xs font-bold px-2 py-0.5 shadow-2xs"
                >
                  {totals.overallRate.toFixed(1)}%
                </Badge>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
