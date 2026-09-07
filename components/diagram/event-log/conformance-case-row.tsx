"use client";

import {
  CheckCircle2,
  ShieldAlert,
  ChevronDown,
  ChevronRight,
  Layers,
  ArrowRight,
} from "lucide-react";
import type { CaseConformanceResult } from "@/types";
import { Badge, Button, TableRow, TableCell } from "@/components/ui";

export interface CaseRowItemProps {
  item: CaseConformanceResult;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  unit: string;
  currency: string;
  tDiag: (key: string) => string;
}

export function CaseRowItem({
  item,
  index,
  isExpanded,
  onToggle,
  unit,
  currency,
  tDiag,
}: CaseRowItemProps) {
  return (
    <>
      <TableRow
        onClick={onToggle}
        className={`cursor-pointer transition-colors hover:bg-muted/30 ${
          isExpanded ? "bg-muted/20" : ""
        }`}
      >
        <TableCell className="py-2.5 px-3 text-center text-muted-foreground font-mono text-[11px]">
          {index}
        </TableCell>
        <TableCell className="py-2.5 px-3 font-semibold font-mono text-foreground">
          {item.caseId}
        </TableCell>
        <TableCell className="py-2.5 px-3">
          {item.isConformant ? (
            <Badge
              variant="outline"
              className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[11px] gap-1 font-medium"
            >
              <CheckCircle2 className="w-3 h-3" />
              {tDiag("statusConformant")}
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 text-[11px] gap-1 font-medium"
            >
              <ShieldAlert className="w-3 h-3" />
              {item.violations.length} {tDiag("violationsCountLabel")}
            </Badge>
          )}
        </TableCell>
        <TableCell className="py-2.5 px-3 font-mono font-semibold">
          <span
            className={
              item.fitnessScore >= 90
                ? "text-emerald-600 dark:text-emerald-400"
                : item.fitnessScore >= 70
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-rose-600 dark:text-rose-400"
            }
          >
            {item.fitnessScore}%
          </span>
        </TableCell>
        <TableCell className="py-2.5 px-3">
          <div className="flex flex-wrap gap-1.5 items-center">
            {item.violations.length === 0 ? (
              <span className="text-muted-foreground italic text-xs">
                {tDiag("fullComplianceMsg")}
              </span>
            ) : (
              item.violations
                .slice(0, 3)
                .map((v) => <ViolationBadge key={v.id} violation={v} tDiag={tDiag} />)
            )}
            {item.violations.length > 3 && (
              <Badge variant="secondary" className="text-[10px] font-mono">
                +{item.violations.length - 3} {tDiag("more")}
              </Badge>
            )}
          </div>
        </TableCell>
        <TableCell className="py-2.5 px-3 text-right font-mono text-muted-foreground">
          {item.totalDuration} {unit}
        </TableCell>
        <TableCell className="py-2.5 px-3 text-center">
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground">
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </Button>
        </TableCell>
      </TableRow>

      {/* Expanded Step Timeline */}
      {isExpanded && (
        <TableRow>
          <TableCell colSpan={7} className="p-4 bg-muted/10 border-b border-border/70">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-primary" />
                  {tDiag("traceStepTimeline")} ({item.steps.length} {tDiag("stepsCount")})
                </span>
                <span className="text-muted-foreground font-normal">
                  {tDiag("totalCost")}: {currency}
                  {item.totalCost.toLocaleString()}
                </span>
              </div>

              {/* Step Pills Chain */}
              <div className="flex items-center gap-2 overflow-x-auto py-2 px-1">
                {item.steps.map((st, i) => (
                  <div key={i} className="flex items-center gap-2 shrink-0">
                    <div
                      className={`p-2 rounded-lg border text-xs min-w-[140px] max-w-[200px] shadow-2xs ${
                        st.status === "conformant"
                          ? "bg-card border-border/70"
                          : st.status === "skipped"
                            ? "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300"
                            : st.status === "out_of_order"
                              ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
                              : st.status === "wrong_resource"
                                ? "bg-violet-500/10 border-violet-500/30 text-violet-700 dark:text-violet-300"
                                : "bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[10px] font-mono text-muted-foreground">
                          #{i + 1}
                        </span>
                        <StepStatusIndicator status={st.status} tDiag={tDiag} />
                      </div>
                      <div className="font-semibold text-xs truncate" title={st.activity}>
                        {st.activity}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                        👤 {st.resource}
                      </div>
                      {st.violationMessage && (
                        <div className="text-[10px] text-destructive mt-1 font-medium leading-tight">
                          ⚠️ {st.violationMessage}
                        </div>
                      )}
                    </div>
                    {i < item.steps.length - 1 && (
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function StepStatusIndicator({
  status,
  tDiag,
}: {
  status: CaseConformanceResult["steps"][0]["status"];
  tDiag: (k: string) => string;
}) {
  if (status === "conformant") {
    return <span className="text-[10px] text-emerald-500 font-medium">✓ {tDiag("valid")}</span>;
  }
  if (status === "skipped") {
    return <span className="text-[10px] text-rose-500 font-bold">✕ {tDiag("tagSkipped")}</span>;
  }
  if (status === "out_of_order") {
    return <span className="text-[10px] text-amber-500 font-bold">⟳ {tDiag("tagOrder")}</span>;
  }
  if (status === "wrong_resource") {
    return <span className="text-[10px] text-violet-500 font-bold">👤 {tDiag("tagResource")}</span>;
  }
  return <span className="text-[10px] text-blue-500 font-bold">? {tDiag("tagUnexpected")}</span>;
}

function ViolationBadge({
  violation,
  tDiag,
}: {
  violation: CaseConformanceResult["violations"][0];
  tDiag: (k: string) => string;
}) {
  if (violation.type === "skipped_activity") {
    return (
      <Badge
        variant="outline"
        className="bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30 text-[10px] font-normal"
      >
        {tDiag("tagSkipped")}: {violation.activity}
      </Badge>
    );
  }
  if (violation.type === "out_of_order") {
    return (
      <Badge
        variant="outline"
        className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] font-normal"
      >
        {tDiag("tagOrder")}: {violation.activity}
      </Badge>
    );
  }
  if (violation.type === "wrong_resource") {
    return (
      <Badge
        variant="outline"
        className="bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30 text-[10px] font-normal"
      >
        {tDiag("tagResource")}: {violation.activity} ({violation.actual})
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 text-[10px] font-normal"
    >
      {tDiag("tagUnexpected")}: {violation.activity}
    </Badge>
  );
}
