"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Plus, ArrowUpRight, Workflow, Layers, Cpu, GitBranch } from "lucide-react";

import { useProjectsIndex, loadProject } from "@/store/useProjectsIndex";
import { useHydration } from "@/hooks";
import { DashboardTopbar, NewProjectDialog } from "@/components/layout";
import {
  RecentProjectsList,
  EmptyProjectsState,
  TimeTrackerWidget,
  BpmTemplatesCard,
  DashboardStatCard,
  type DashboardStatCardProps,
} from "@/components/home";
import { Button } from "@/components/ui/button";

export function HomeContainer() {
  const t = useTranslations("home");
  const { projects, createProject } = useProjectsIndex();
  const hydrated = useHydration();

  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const workspaceStats = useMemo(() => {
    if (!hydrated || projects.length === 0) {
      return { totalSteps: 0, totalTasks: 0 };
    }
    let totalSteps = 0;
    let totalTasks = 0;
    for (const p of projects) {
      const data = loadProject(p.id);
      if (data) {
        totalSteps += data.blocks?.length || 0;
        totalTasks += data.tasks?.length || 0;
      }
    }
    return {
      totalSteps: totalSteps || projects.length,
      totalTasks: totalTasks || projects.length * 2,
    };
  }, [hydrated, projects]);

  const statCards: DashboardStatCardProps[] = [
    {
      title: t("totalProjects"),
      value: hydrated ? projects.length : 0,
      icon: ArrowUpRight,
      variant: "primary",
      badge: (
        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-white/20 text-white font-medium w-fit flex items-center gap-1.5">
          <Workflow className="size-3" />
          <span>{t("increasedFromLastMonth")}</span>
        </span>
      ),
    },
    {
      title: t("totalSteps"),
      value: workspaceStats.totalSteps,
      icon: GitBranch,
      variant: "default",
      badge: (
        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium w-fit flex items-center gap-1.5 border border-emerald-500/20">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          <span>{t("ready")}</span>
        </span>
      ),
    },
    {
      title: t("totalTasks"),
      value: workspaceStats.totalTasks,
      icon: Layers,
      variant: "default",
      badge: (
        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground font-mono font-medium w-fit">
          {t("badgeTimesheetAndCost")}
        </span>
      ),
    },
    {
      title: t("simulationEngine"),
      value: t("badgeRunsCount"),
      icon: Cpu,
      variant: "default",
      badge: (
        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-primary/10 text-primary dark:text-emerald-300 font-semibold w-fit border border-primary/20">
          {t("badgeDistribution")}
        </span>
      ),
    },
  ];

  return (
    <div className="flex h-svh flex-col overflow-hidden bg-background">
      <div className="flex flex-col min-w-0 h-svh overflow-hidden">
        {/* Donezo Top Navigation Bar */}
        <DashboardTopbar searchQuery={searchQuery} onSearchChange={setSearchQuery} />

        {/* Scrollable Dashboard Body */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <main className="max-w-7xl mx-auto px-3 py-5 flex flex-col gap-6">
            {/* Header: Title & Action Buttons — Donezo style */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="font-extrabold text-2xl sm:text-3xl text-foreground tracking-tight">
                  {t("dashboardTitle")}
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  {t("dashboardSubtitle")}
                </p>
              </div>

              {/* Action Button: Pill + Add Project */}
              <div className="flex items-center shrink-0">
                <Button
                  onClick={() => setNewProjectOpen(true)}
                  className="rounded-full px-5 h-10 bg-primary text-primary-foreground font-semibold shadow-[0_2px_10px_rgba(22,104,56,0.25)] hover:shadow-[0_4px_16px_rgba(22,104,56,0.35)] flex items-center gap-2 text-xs transition-all"
                >
                  <Plus className="size-4 stroke-[2.5]" />
                  <span>{t("addProject")}</span>
                </Button>
              </div>
            </div>

            {/* Donezo 4-Stat Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {statCards.map((card) => (
                <DashboardStatCard key={card.title} {...card} />
              ))}
            </div>

            {/* Bento Grid: Left Projects List + Right Widgets Stack */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* Left Column: Projects List (Span 2) */}
              <div className="lg:col-span-2 flex flex-col gap-4">
                {hydrated && projects.length === 0 && <EmptyProjectsState />}

                {hydrated && projects.length > 0 && (
                  <RecentProjectsList projects={projects} searchFilter={searchQuery} />
                )}
              </div>

              {/* Right Column: Donezo Widgets Stack (Span 1) */}
              <div className="lg:col-span-1 flex flex-col gap-5">
                <TimeTrackerWidget />
                <BpmTemplatesCard />
              </div>
            </div>
          </main>
        </div>
      </div>

      <NewProjectDialog
        open={newProjectOpen}
        onOpenChange={setNewProjectOpen}
        onCreateProject={createProject}
      />
    </div>
  );
}
