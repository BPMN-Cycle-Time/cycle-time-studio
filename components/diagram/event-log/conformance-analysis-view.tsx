"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  ShieldCheck,
  FileWarning,
  XCircle,
  Layers,
  UserX,
  Clock,
  CheckCircle2,
  ShieldAlert,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import type { Block, Task, EventLogItem, CaseConformanceResult } from "@/types";
import { analyzeConformance } from "@/services/conformance";
import { Badge, Button, AppSelect, DataTable, type TableColumn } from "@/components/ui";
import type { DiagramTab } from "@/components/layout";
import { DiscoveredBpmnDialog } from "./discovered-bpmn-dialog";
import { CaseTimelineExpanded, ViolationBadge } from "./conformance-case-row";
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

  // Filter cases by status and violation type
  const statusFilteredCases = useMemo(() => {
    return analysis.caseResults.filter((item) => {
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
  }, [analysis.caseResults, statusFilter, violationTypeFilter]);

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

  const columns: TableColumn<CaseConformanceResult>[] = useMemo(
    () => [
      {
        key: "index",
        header: "#",
        sortable: false,
        className: "w-10 text-center text-muted-foreground font-mono text-[11px]",
        headerClassName: "w-10 text-center",
        render: (_row, idx) => (idx != null ? idx + 1 : "-"),
      },
      {
        key: "caseId",
        header: tDiag("colCaseId"),
        sortable: true,
        sortValue: (row) => row.caseId,
        className: "w-28 font-semibold font-mono text-foreground",
      },
      {
        key: "status",
        header: tDiag("colStatus"),
        sortable: true,
        sortValue: (row) => (row.isConformant ? 1 : 0),
        csvValue: (row) =>
          row.isConformant
            ? tDiag("statusConformant")
            : `${row.violations.length} ${tDiag("violationsCountLabel")}`,
        className: "w-32",
        render: (item) =>
          item.isConformant ? (
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
          ),
      },
      {
        key: "fitnessScore",
        header: tDiag("colFitness"),
        sortable: true,
        sortValue: (row) => row.fitnessScore,
        csvValue: (row) => `${row.fitnessScore}%`,
        className: "w-28 font-mono font-semibold",
        render: (item) => (
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
        ),
      },
      {
        key: "violations",
        header: tDiag("colViolationsDetail"),
        sortable: false,
        csvValue: (row) =>
          row.violations.length === 0
            ? tDiag("fullComplianceMsg")
            : row.violations.map((v) => v.message).join("; "),
        render: (item) => (
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
        ),
      },
      {
        key: "totalDuration",
        header: tDiag("colDuration"),
        sortable: true,
        sortValue: (row) => row.totalDuration,
        csvValue: (row) => `${row.totalDuration} ${unit}`,
        className: "w-24 text-right font-mono text-muted-foreground",
        headerClassName: "text-right justify-end",
        render: (item) => `${item.totalDuration} ${unit}`,
      },
      {
        key: "action",
        header: tDiag("colAction"),
        sortable: false,
        csvExport: false,
        className: "w-16 text-center",
        headerClassName: "text-center justify-center",
        render: (item) => (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground"
            onClick={(e) => {
              e.stopPropagation();
              toggleExpand(item.caseId);
            }}
          >
            {expandedCaseId === item.caseId ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </Button>
        ),
      },
    ],
    [tDiag, unit, expandedCaseId],
  );

  return (
    <div className="flex flex-col gap-4 w-full @container">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 @[480px]:grid-cols-3 @[1100px]:grid-cols-6 gap-2.5">
        {kpiCards.map((kpi) => (
          <KpiStatCard key={kpi.id} {...kpi} />
        ))}
      </div>

      {/* Action Toolbar & Filters */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 bg-card border border-border/70 p-3 px-3.5 rounded-xl shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5">
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

      {/* Conformance Cases DataTable with Pagination, Sorting, Search & Expandable Timelines */}
      <DataTable<CaseConformanceResult>
        data={statusFilteredCases}
        columns={columns}
        searchPlaceholder={tDiag("searchCaseOrViolation")}
        customFilter={(item, q) => {
          const matchId = item.caseId.toLowerCase().includes(q);
          const matchAct = item.executedActivities.some((a) => a.toLowerCase().includes(q));
          const matchViol = item.violations.some((v) => v.message.toLowerCase().includes(q));
          return matchId || matchAct || matchViol;
        }}
        getRowId={(item) => item.caseId}
        isRowExpanded={(item) => expandedCaseId === item.caseId}
        onRowClick={(item) => toggleExpand(item.caseId)}
        renderSubRow={(item) => (
          <CaseTimelineExpanded item={item} currency={currency} tDiag={tDiag} />
        )}
        emptyMessage={tDiag("noCasesMatchingFilter")}
        defaultPageSize={10}
        pageSizeOptions={[10, 20, 50, 100]}
      />
    </div>
  );
}
