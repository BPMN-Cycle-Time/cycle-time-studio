"use client";

import { useState, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import { RotateCcw, CheckCircle2, AlertCircle } from "lucide-react";
import type { TaskBenchmarkSummary } from "@/types";
import {
  Badge,
  Button,
  Input,
  DataTable,
  TableFooter,
  TableRow,
  TableCell,
  type TableColumn,
} from "@/components/ui";
import { cleanTaskName, formatDisplayTaskId, cn } from "@/utils";

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

  const handleInputChange = useCallback((taskId: string, val: string) => {
    setEditingValues((prev) => ({ ...prev, [taskId]: val }));
  }, []);

  const handleApplyBenchmark = useCallback(
    (taskId: string) => {
      const rawVal = editingValues[taskId];
      if (rawVal !== undefined) {
        const num = parseFloat(rawVal);
        if (!isNaN(num) && num > 0) {
          onBenchmarkChange?.(taskId, num);
        }
      }
    },
    [editingValues, onBenchmarkChange],
  );

  // Compute overall summary totals
  const totals = useMemo(() => {
    const totalInstances = taskSummaries.reduce((acc, t) => acc + t.totalInstances, 0);
    const totalMet = taskSummaries.reduce((acc, t) => acc + t.metCount, 0);
    const totalDelayed = taskSummaries.reduce((acc, t) => acc + t.delayedCount, 0);
    const overallRate =
      totalInstances > 0 ? Math.round((totalMet / totalInstances) * 1000) / 10 : 100;
    return { totalInstances, totalMet, totalDelayed, overallRate };
  }, [taskSummaries]);

  const columns: TableColumn<TaskBenchmarkSummary>[] = useMemo(
    () => [
      {
        key: "taskId",
        header: tDiag("colTaskId"),
        sortable: true,
        sortValue: (row) => row.taskId,
        className: "py-2.5 px-3 font-mono text-xs font-semibold",
        render: (summary, index) => (
          <Badge
            variant="outline"
            className="bg-muted/50 font-mono text-xs font-bold"
            title={summary.taskId}
          >
            {formatDisplayTaskId(summary.taskId, index ?? 0)}
          </Badge>
        ),
      },
      {
        key: "taskName",
        header: tDiag("colTaskName"),
        sortable: true,
        sortValue: (row) => cleanTaskName(row.taskName),
        className: "py-2.5 px-3 text-xs font-medium text-foreground",
        render: (summary) => cleanTaskName(summary.taskName),
      },
      {
        key: "benchmarkDuration",
        header: tDiag("colBenchmarkDuration", { unit }),
        sortable: true,
        sortValue: (row) => row.benchmarkDuration,
        className: "py-2.5 px-3 text-right",
        headerClassName: "text-right justify-end",
        render: (summary) => {
          const currentInputVal =
            editingValues[summary.taskId] ?? String(summary.benchmarkDuration);
          return (
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
          );
        },
      },
      {
        key: "totalInstances",
        header: tDiag("colTotalInstances"),
        sortable: true,
        sortValue: (row) => row.totalInstances,
        className: "py-2.5 px-3 text-center font-mono text-xs font-medium",
        headerClassName: "text-center justify-center",
        render: (summary) => summary.totalInstances,
      },
      {
        key: "metCount",
        header: tDiag("colMetCount"),
        sortable: true,
        sortValue: (row) => row.metCount,
        className: "py-2.5 px-3 text-center font-mono text-xs",
        headerClassName: "text-center justify-center",
        render: (summary) => (
          <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3 h-3" />
            {summary.metCount}
          </span>
        ),
      },
      {
        key: "delayedCount",
        header: tDiag("colDelayedCount"),
        sortable: true,
        sortValue: (row) => row.delayedCount,
        className: "py-2.5 px-3 text-center font-mono text-xs",
        headerClassName: "text-center justify-center",
        render: (summary) =>
          summary.delayedCount > 0 ? (
            <span className="inline-flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-3 h-3" />
              {summary.delayedCount}
            </span>
          ) : (
            <span className="text-muted-foreground font-mono">0</span>
          ),
      },
      {
        key: "complianceRate",
        header: tDiag("colComplianceRate"),
        sortable: true,
        sortValue: (row) => row.complianceRate,
        csvValue: (row) => `${row.complianceRate.toFixed(1)}%`,
        className: "py-2.5 px-3 text-right font-mono text-xs",
        headerClassName: "text-right justify-end",
        render: (summary) => {
          const isRateHigh = summary.complianceRate >= 80;
          const isRateLow = summary.complianceRate < 50;
          return (
            <div className="flex items-center justify-end gap-2">
              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden hidden sm:block">
                <div
                  className={cn(
                    "h-full transition-all duration-300",
                    isRateHigh ? "bg-emerald-500" : isRateLow ? "bg-rose-500" : "bg-amber-500",
                  )}
                  style={{ width: `${summary.complianceRate}%` }}
                />
              </div>
              <Badge
                variant={isRateHigh ? "secondary" : isRateLow ? "destructive" : "outline"}
                className={cn(
                  "font-mono text-xs font-bold px-1.5 py-0",
                  isRateHigh
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                    : isRateLow
                      ? ""
                      : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
                )}
              >
                {summary.complianceRate.toFixed(1)}%
              </Badge>
            </div>
          );
        },
      },
    ],
    [tDiag, unit, editingValues, handleInputChange, handleApplyBenchmark],
  );

  const toolbarLeft = useMemo(
    () => (
      <div className="flex items-center gap-2">
        <h3 className="text-xs font-semibold capitalize tracking-wider text-foreground flex items-center gap-1.5">
          {tDiag("slaEvaluationTitle")}
        </h3>
        <Badge variant="outline" className="text-[11px] font-mono">
          {taskSummaries.length} {tDiag("stepsCount")}
        </Badge>
      </div>
    ),
    [tDiag, taskSummaries.length],
  );

  const toolbarRight = useMemo(
    () =>
      hasCustomBenchmarks && onResetBenchmarks ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={onResetBenchmarks}
          className="h-7 text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="w-3 h-3" />
          {tDiag("resetBenchmarks")}
        </Button>
      ) : null,
    [hasCustomBenchmarks, onResetBenchmarks, tDiag],
  );

  const renderFooter = () => (
    <TableFooter>
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
    </TableFooter>
  );

  return (
    <div className="w-full">
      <DataTable<TaskBenchmarkSummary>
        data={taskSummaries}
        columns={columns}
        searchPlaceholder={tDiag("searchBenchmarks")}
        searchKeys={["taskId", "taskName"]}
        getRowId={(row) => row.taskId}
        toolbarLeft={toolbarLeft}
        toolbarRight={toolbarRight}
        renderFooter={renderFooter}
        defaultPageSize={10}
        pageSizeOptions={[10, 20, 50, 100]}
      />
    </div>
  );
}
