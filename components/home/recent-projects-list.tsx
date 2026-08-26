"use client";

import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { Copy, ArrowRight } from "lucide-react";
import { useProjectsIndex } from "@/store/useProjectsIndex";
import type { ProjectSummary } from "@/types";
import { Button, AppCard } from "@/components/ui";

interface RecentProjectsListProps {
  projects: ProjectSummary[];
}

export function RecentProjectsList({ projects }: RecentProjectsListProps) {
  const format = useFormatter();
  const t = useTranslations("Home");
  const { duplicateProject } = useProjectsIndex();

  return (
    <>
      <h2 className="text-xs uppercase tracking-wide text-muted-foreground mb-3">
        {t("recentProjects")}
      </h2>
      <div className="flex flex-col gap-2">
        {projects.map((p) => (
          <AppCard key={p.id} className="py-0" contentClassName="flex items-center gap-3 px-4 py-3">
            <Link
              href={`/project/${p.id}`}
              className="flex-1 min-w-0 flex items-center gap-2 group"
            >
              <div className="min-w-0">
                <div className="font-medium truncate">{p.name}</div>
                <div className="text-xs text-muted-foreground font-mono">
                  {t("updated", {
                    date: format.dateTime(new Date(p.updatedAt), {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }),
                  })}
                </div>
              </div>
              <ArrowRight className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </Link>
            <Button variant="outline" size="sm" onClick={() => duplicateProject(p.id)}>
              <Copy /> {t("duplicate")}
            </Button>
          </AppCard>
        ))}
      </div>
    </>
  );
}
