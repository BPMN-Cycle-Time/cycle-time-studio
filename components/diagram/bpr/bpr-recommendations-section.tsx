"use client";

import { useTranslations } from "next-intl";

import { AppCard, DataTable, Badge } from "@/components/ui";
import type { TableColumn } from "@/components/ui";
import type { BprRecommendation, BprImpact, BprTechnique } from "@/types";

interface BprRecommendationsSectionProps {
  recommendations: BprRecommendation[];
}

export function BprRecommendationsSection({ recommendations }: BprRecommendationsSectionProps) {
  const t = useTranslations("bpr");

  const techniqueVariant = (technique: BprTechnique) => {
    switch (technique) {
      case "elimination":
        return "secondary";
      case "resequencing":
        return "inProgress";
      case "parallelization":
        return "success";
      case "specialization":
        return "outline";
      case "resourceOptimization":
        return "default";
      case "communicationOptimization":
        return "outline";
      case "automation":
        return "default";
      default:
        return "secondary";
    }
  };

  const impactColor = (impact: BprImpact) => {
    switch (impact) {
      case "high":
        return "text-emerald-600 dark:text-emerald-400";
      case "medium":
        return "text-amber-600 dark:text-amber-400";
      case "low":
      default:
        return "text-muted-foreground";
    }
  };

  const columns: TableColumn<BprRecommendation>[] = [
    {
      key: "technique",
      header: t("recommendations.technique"),
      render: (row) => (
        <Badge variant={techniqueVariant(row.technique) as never}>
          {t(`recommendations.techniques.${row.technique}`)}
        </Badge>
      ),
      sortValue: (row) => row.technique,
      sortable: true,
    },
    {
      key: "title",
      header: t("recommendations.title"),
      render: (row) => <span className="font-medium text-foreground">{row.title}</span>,
      sortValue: (row) => row.title,
      sortable: true,
    },
    {
      key: "description",
      header: t("recommendations.title"),
      render: (row) => <span className="text-muted-foreground text-xs">{row.description}</span>,
    },
    {
      key: "impact",
      header: t("recommendations.impact"),
      render: (row) => (
        <span className={`text-xs font-semibold ${impactColor(row.impact)}`}>
          {t(`recommendations.impactLevels.${row.impact}`)}
        </span>
      ),
      sortValue: (row) => ({ high: 0, medium: 1, low: 2 })[row.impact],
      sortable: true,
    },
    {
      key: "confidence",
      header: t("recommendations.confidence"),
      render: (row) => (
        <span className={`text-xs font-semibold ${impactColor(row.confidence)}`}>
          {t(`recommendations.confidenceLevels.${row.confidence}`)}
        </span>
      ),
      sortValue: (row) => ({ high: 0, medium: 1, low: 2 })[row.confidence],
      sortable: true,
    },
  ];

  return (
    <AppCard title={t("sections.recommendations")} contentClassName="flex flex-col gap-3">
      <DataTable<BprRecommendation>
        data={recommendations}
        columns={columns}
        showSearch={false}
        showPagination={recommendations.length > 10}
        showCopyCsv={false}
        defaultPageSize={10}
        emptyMessage={
          <span className="text-muted-foreground text-sm">{t("recommendations.empty")}</span>
        }
      />
    </AppCard>
  );
}
