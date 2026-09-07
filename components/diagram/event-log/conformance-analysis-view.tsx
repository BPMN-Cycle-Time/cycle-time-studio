"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { ShieldCheck, FileWarning, XCircle, Layers, UserX, Clock } from "lucide-react";
import type { Block, Task, EventLogItem } from "@/types";
import { analyzeConformance } from "@/services/conformance";
import {
  AppCard,
  Input,
  AppSelect,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui";
import { DiscoveredBpmnDialog } from "./discovered-bpmn-dialog";
import { CaseRowItem } from "./conformance-case-row";

interface ConformanceAnalysisViewProps {
  events: EventLogItem[];
  blocks: Block[];
  tasks?: Task[];
  unit: string;
  currency: string;
}

export function ConformanceAnalysisView({
  events,
  blocks,
  tasks,
  unit,
  currency,
}: ConformanceAnalysisViewProps) {
  const tDiag = useTranslations("diagram");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "conformant" | "violation">("all");
  const [violationTypeFilter, setViolationTypeFilter] = useState<string>("all");
  const [expandedCaseId, setExpandedCaseId] = useState<string | null>(null);

  const analysis = useMemo(
    () => analyzeConformance(events, blocks, tasks),
    [events, blocks, tasks],
  );

  const statusOptions = useMemo(
    () => [
      { value: "all", label: tDiag("filterAllCases") },
      { value: "conformant", label: tDiag("filterConformantOnly") },
      { value: "violation", label: tDiag("filterViolationsOnly") },
    ],
    [tDiag],
  );

  const violationTypeOptions = useMemo(
    () => [
      { value: "all", label: tDiag("filterAllTypes") },
      { value: "skipped_activity", label: tDiag("filterSkippedOnly") },
      { value: "out_of_order", label: tDiag("filterOrderOnly") },
      { value: "wrong_resource", label: tDiag("filterResourceOnly") },
      { value: "unexpected_activity", label: tDiag("filterUnexpectedOnly") },
    ],
    [tDiag],
  );

  // Filtered cases
  const filteredCases = useMemo(() => {
    return analysis.caseResults.filter((item) => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchId = item.caseId.toLowerCase().includes(q);
        const matchAct = item.executedActivities.some((a) => a.toLowerCase().includes(q));
        const matchViol = item.violations.some((v) => v.message.toLowerCase().includes(q));
        if (!matchId && !matchAct && !matchViol) return false;
      }

      // Status
      if (statusFilter === "conformant" && !item.isConformant) return false;
      if (statusFilter === "violation" && item.isConformant) return false;

      // Violation type
      if (violationTypeFilter !== "all") {
        const hasType = item.violations.some((v) => v.type === violationTypeFilter);
        if (!hasType) return false;
      }

      return true;
    });
  }, [analysis.caseResults, search, statusFilter, violationTypeFilter]);

  const toggleExpand = (caseId: string) => {
    setExpandedCaseId((prev) => (prev === caseId ? null : caseId));
  };

  const fitnessColor =
    analysis.overallFitnessScore >= 85
      ? "text-emerald-600 dark:text-emerald-400"
      : analysis.overallFitnessScore >= 70
        ? "text-amber-600 dark:text-amber-400"
        : "text-rose-600 dark:text-rose-400";

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5">
        {/* Fitness Card */}
        <AppCard className="p-4 bg-card/70 border-border/80 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {tDiag("overallFitnessScore")}
            </span>
            <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-500">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className={`text-2xl font-bold font-mono tracking-tight ${fitnessColor}`}>
              {analysis.overallFitnessScore}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {analysis.conformantCases} / {analysis.totalCases} {tDiag("conformantCasesLabel")}
            </p>
          </div>
        </AppCard>

        {/* Skipped Steps */}
        <AppCard className="p-4 bg-card/70 border-border/80 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {tDiag("skippedActivities")}
            </span>
            <div className="p-1.5 rounded-md bg-rose-500/10 text-rose-500">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono tracking-tight text-rose-600 dark:text-rose-400">
              {analysis.violationCounts.skipped_activity}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{tDiag("skippedActivitiesDesc")}</p>
          </div>
        </AppCard>

        {/* Out-of-Order */}
        <AppCard className="p-4 bg-card/70 border-border/80 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {tDiag("outOfOrderActivities")}
            </span>
            <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-500">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono tracking-tight text-amber-600 dark:text-amber-400">
              {analysis.violationCounts.out_of_order}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{tDiag("outOfOrderDesc")}</p>
          </div>
        </AppCard>

        {/* Wrong Resource */}
        <AppCard className="p-4 bg-card/70 border-border/80 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {tDiag("wrongResourceViolations")}
            </span>
            <div className="p-1.5 rounded-md bg-violet-500/10 text-violet-500">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono tracking-tight text-violet-600 dark:text-violet-400">
              {analysis.violationCounts.wrong_resource}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{tDiag("wrongResourceDesc")}</p>
          </div>
        </AppCard>

        {/* Unexpected Activity */}
        <AppCard className="p-4 bg-card/70 border-border/80 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {tDiag("unexpectedActivities")}
            </span>
            <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-500">
              <FileWarning className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono tracking-tight text-blue-600 dark:text-blue-400">
              {analysis.violationCounts.unexpected_activity}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {tDiag("unexpectedActivitiesDesc")}
            </p>
          </div>
        </AppCard>

        {/* Variants Count */}
        <AppCard className="p-4 bg-card/70 border-border/80 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {tDiag("traceVariants")}
            </span>
            <div className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-500">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
              {analysis.variants.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {analysis.nonConformantCases} {tDiag("nonConformantCasesLabel")}
            </p>
          </div>
        </AppCard>
      </div>

      {/* Action Toolbar & Filters */}
      <AppCard className="p-4 bg-card border border-border/70 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[280px]">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tDiag("searchCaseOrViolation")}
            className="h-8 text-xs max-w-sm"
          />

          {/* Status Filter */}
          <div className="w-40">
            <AppSelect
              value={statusFilter}
              onValueChange={(val) => setStatusFilter(val as "all" | "conformant" | "violation")}
              options={statusOptions}
              size="sm"
            />
          </div>

          {/* Type Filter */}
          <div className="w-48">
            <AppSelect
              value={violationTypeFilter}
              onValueChange={(val) => setViolationTypeFilter(val)}
              options={violationTypeOptions}
              size="sm"
            />
          </div>
        </div>

        {/* Generate BPMN from Log */}
        <DiscoveredBpmnDialog events={events} />
      </AppCard>

      {/* Case Violations Table using standard shadcn Table components */}
      <AppCard className="p-0 overflow-hidden border-border/80 shadow-xs">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border/70 bg-muted/30 text-muted-foreground font-semibold hover:bg-muted/30">
              <TableHead className="w-10 text-center">#</TableHead>
              <TableHead className="w-28">{tDiag("colCaseId")}</TableHead>
              <TableHead className="w-32">{tDiag("colStatus")}</TableHead>
              <TableHead className="w-28">{tDiag("colFitness")}</TableHead>
              <TableHead>{tDiag("colViolationsDetail")}</TableHead>
              <TableHead className="w-24 text-right">{tDiag("colDuration")}</TableHead>
              <TableHead className="w-20 text-center">{tDiag("colAction")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border/60">
            {filteredCases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  {tDiag("noCasesMatchingFilter")}
                </TableCell>
              </TableRow>
            ) : (
              filteredCases.map((c, idx) => (
                <CaseRowItem
                  key={c.caseId}
                  item={c}
                  index={idx + 1}
                  isExpanded={expandedCaseId === c.caseId}
                  onToggle={() => toggleExpand(c.caseId)}
                  unit={unit}
                  currency={currency}
                  tDiag={tDiag}
                />
              ))
            )}
          </TableBody>
        </Table>
      </AppCard>
    </div>
  );
}
