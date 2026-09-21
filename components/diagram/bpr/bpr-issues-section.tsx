"use client";

import { useTranslations } from "next-intl";

import { AppCard, DataTable, Badge } from "@/components/ui";
import type { TableColumn } from "@/components/ui";
import type { BprIssue, BprSeverity } from "@/types";

interface BprIssuesSectionProps {
  issues: BprIssue[];
}

export function BprIssuesSection({ issues }: BprIssuesSectionProps) {
  const t = useTranslations("bpr");

  const severityVariant = (severity: BprSeverity) => {
    switch (severity) {
      case "critical":
        return "destructive";
      case "high":
        return "pending";
      case "medium":
        return "inProgress";
      case "low":
      default:
        return "secondary";
    }
  };

  const columns: TableColumn<BprIssue>[] = [
    {
      key: "title",
      header: t("issues.title"),
      render: (row) => <span className="font-medium text-foreground">{row.title}</span>,
      sortValue: (row) => row.title,
      sortable: true,
    },
    {
      key: "type",
      header: t("issues.type"),
      render: (row) => (
        <span className="text-muted-foreground text-xs">{t(`issues.types.${row.type}`)}</span>
      ),
      sortValue: (row) => row.type,
      sortable: true,
    },
    {
      key: "severity",
      header: t("issues.severity"),
      render: (row) => (
        <Badge variant={severityVariant(row.severity)}>
          {t(`issues.severityLevels.${row.severity}`)}
        </Badge>
      ),
      sortValue: (row) => ({ critical: 0, high: 1, medium: 2, low: 3 })[row.severity],
      sortable: true,
    },
    {
      key: "description",
      header: t("issues.title"),
      render: (row) => <span className="text-muted-foreground text-xs">{row.description}</span>,
    },
    {
      key: "evidence",
      header: t("issues.evidence"),
      render: (row) => (
        <span className="text-muted-foreground text-xs font-mono">{row.evidence}</span>
      ),
    },
    {
      key: "affectedTasks",
      header: t("issues.affectedTasks"),
      render: (row) =>
        row.affectedTaskNames.length > 0 ? (
          <span className="text-muted-foreground text-xs truncate max-w-[200px]">
            {row.affectedTaskNames.join(", ")}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
    },
  ];

  return (
    <AppCard title={t("sections.issues")} contentClassName="flex flex-col gap-3">
      <DataTable<BprIssue>
        data={issues}
        columns={columns}
        showSearch={false}
        showPagination={issues.length > 10}
        showCopyCsv={false}
        defaultPageSize={10}
        emptyMessage={<span className="text-muted-foreground text-sm">{t("issues.empty")}</span>}
      />
    </AppCard>
  );
}
