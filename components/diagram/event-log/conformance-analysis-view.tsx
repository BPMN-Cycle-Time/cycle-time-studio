"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { ShieldCheck, FileWarning, XCircle, Layers, UserX, Clock, Search } from "lucide-react";
import type { Block, Task, EventLogItem } from "@/types";
import { analyzeConformance } from "@/services/conformance";
import {
  Input,
  AppSelect,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui";
import type { DiagramTab } from "@/components/layout";
import { DiscoveredBpmnDialog } from "./discovered-bpmn-dialog";
import { CaseRowItem } from "./conformance-case-row";
import { KpiStatCard } from "./kpi-stat-card";

interface ConformanceAnalysisViewProps {
  events: EventLogItem[];
  blocks: Block[];
  tasks?: Task[];
  unit: string;
  currency: string;
  onSwitchDiagramTab?: (tab: DiagramTab) => void;
}

export function ConformanceAnalysisView({
  events,
  blocks,
  tasks,
  unit,
  currency,
  onSwitchDiagramTab,
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

  const kpiCards = useMemo(
    () => [
      {
        id: "fitness",
        label: tDiag("overallFitnessScore"),
        value: `${analysis.overallFitnessScore}%`,
        description: `${analysis.conformantCases} / ${analysis.totalCases} ${tDiag("conformantCasesLabel")}`,
        tag: tDiag("kpiTagFitness"),
        icon: ShieldCheck,
        accentColor: "emerald" as const,
      },
      {
        id: "skipped",
        label: tDiag("skippedActivities"),
        value: analysis.violationCounts.skipped_activity,
        description: tDiag("skippedActivitiesDesc"),
        tag: tDiag("tagSkipped"),
        icon: XCircle,
        accentColor: "rose" as const,
      },
      {
        id: "out-of-order",
        label: tDiag("outOfOrderActivities"),
        value: analysis.violationCounts.out_of_order,
        description: tDiag("outOfOrderDesc"),
        tag: tDiag("tagOrder"),
        icon: Clock,
        accentColor: "amber" as const,
      },
      {
        id: "wrong-resource",
        label: tDiag("wrongResourceViolations"),
        value: analysis.violationCounts.wrong_resource,
        description: tDiag("wrongResourceDesc"),
        tag: tDiag("tagResource"),
        icon: UserX,
        accentColor: "violet" as const,
      },
      {
        id: "unexpected",
        label: tDiag("unexpectedActivities"),
        value: analysis.violationCounts.unexpected_activity,
        description: tDiag("unexpectedActivitiesDesc"),
        tag: tDiag("tagUnexpected"),
        icon: FileWarning,
        accentColor: "sky" as const,
      },
      {
        id: "variants",
        label: tDiag("traceVariants"),
        value: analysis.variants.length,
        description: `${analysis.nonConformantCases} ${tDiag("nonConformantCasesLabel")}`,
        tag: tDiag("kpiTagVariants"),
        icon: Layers,
        accentColor: "indigo" as const,
      },
    ],
    [analysis, tDiag],
  );

  return (
    <div className="flex flex-col gap-4 w-full @container">
      {/* KPI Cards Grid - Styled consistently like Event Log Data KPI cards */}
      <div className="grid grid-cols-2 @[480px]:grid-cols-3 @[1100px]:grid-cols-6 gap-2.5">
        {kpiCards.map((kpi) => (
          <KpiStatCard key={kpi.id} {...kpi} />
        ))}
      </div>

      {/* Action Toolbar & Filters */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 bg-card border border-border/70 p-3 px-3.5 rounded-xl shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tDiag("searchCaseOrViolation")}
              className="h-8 text-xs pl-8 pr-3 bg-background/70"
            />
          </div>

          {/* Status Filter */}
          <div className="w-40 shrink-0">
            <AppSelect
              value={statusFilter}
              onValueChange={(val) => setStatusFilter(val as "all" | "conformant" | "violation")}
              options={statusOptions}
              size="sm"
            />
          </div>

          {/* Type Filter */}
          <div className="w-48 shrink-0">
            <AppSelect
              value={violationTypeFilter}
              onValueChange={(val) => setViolationTypeFilter(val)}
              options={violationTypeOptions}
              size="sm"
            />
          </div>
        </div>

        {/* Generate BPMN from Log */}
        <div className="shrink-0">
          <DiscoveredBpmnDialog events={events} onSwitchDiagramTab={onSwitchDiagramTab} />
        </div>
      </div>

      {/* Case Violations Table using standard shadcn Table components */}
      <div className="rounded-xl border border-border/70 overflow-hidden bg-card shadow-xs">
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
      </div>
    </div>
  );
}
