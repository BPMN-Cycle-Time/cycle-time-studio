"use client";

import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { Copy, ArrowUpRight, Workflow } from "lucide-react";
import { useProjectsIndex } from "@/store/useProjectsIndex";
import type { ProjectSummary } from "@/types";
import { Button } from "@/components/ui/button";

interface RecentProjectsListProps {
  projects: ProjectSummary[];
  searchFilter?: string;
}

export function RecentProjectsList({ projects, searchFilter = "" }: RecentProjectsListProps) {
  const format = useFormatter();
  const t = useTranslations("Home");
  const { duplicateProject } = useProjectsIndex();

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchFilter.toLowerCase()),
  );

  return (
    <div className="rounded-2xl bg-card border border-border/80 p-5 shadow-xs flex flex-col gap-4">
      {/* Header — Donezo Project Card Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-base text-foreground tracking-tight">
            {t("recentProjects")}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {filteredProjects.length} {t("totalProjects").toLowerCase()}
          </p>
        </div>
      </div>

      {/* Project Items List */}
      <div className="flex flex-col gap-2.5">
        {filteredProjects.map((p) => (
          <div
            key={p.id}
            className="group flex items-center gap-3.5 p-3.5 rounded-xl border border-border/60 hover:border-primary/30 bg-background/50 hover:bg-card hover:shadow-xs transition-all duration-150"
          >
            {/* Project Icon Badge */}
            <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20 group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-2xs transition-all duration-200">
              <Workflow className="size-5" />
            </div>

            {/* Info */}
            <Link href={`/project/${p.id}`} className="flex-1 min-w-0 flex flex-col justify-center">
              <div className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors tracking-tight">
                {p.name}
              </div>
              <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                {t("updated", {
                  date: format.dateTime(new Date(p.updatedAt), {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }),
                })}
              </div>
            </Link>

            {/* Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2.5 rounded-lg text-xs text-muted-foreground hover:text-foreground"
                onClick={() => duplicateProject(p.id)}
                title={t("duplicate")}
              >
                <Copy className="size-3.5" />
                <span className="hidden sm:inline">{t("duplicate")}</span>
              </Button>

              <Button
                size="icon"
                variant="outline"
                className="size-8 rounded-full text-muted-foreground group-hover:text-primary group-hover:border-primary/40"
                asChild
              >
                <Link href={`/project/${p.id}`}>
                  <ArrowUpRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
