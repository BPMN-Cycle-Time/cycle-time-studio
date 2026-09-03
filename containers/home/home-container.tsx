"use client";

import { useTranslations } from "next-intl";
import { useProjectsIndex } from "@/store/useProjectsIndex";
import { useHydration } from "@/hooks";
import { ProjectSidebar } from "@/components/layout";
import { RecentProjectsList, EmptyProjectsState } from "@/components/home";

export function HomeContainer() {
  const t = useTranslations("Home");
  const { projects } = useProjectsIndex();
  const hydrated = useHydration();

  return (
    <div className="flex h-svh overflow-hidden bg-muted/30 dark:bg-zinc-950/60">
      <ProjectSidebar />

      <div className="flex-1 overflow-y-auto">
        <main className="max-w-2xl mx-auto px-6 py-14">
          <p className="font-mono text-xs tracking-wider uppercase text-muted-foreground mb-3">
            Cycle Time Studio
          </p>
          <h1 className="font-semibold text-3xl mb-3 text-balance">{t("title")}</h1>
          <p className="text-muted-foreground max-w-[56ch] mb-10">{t("description")}</p>

          {hydrated && projects.length === 0 && <EmptyProjectsState />}

          {hydrated && projects.length > 0 && <RecentProjectsList projects={projects} />}
        </main>
      </div>
    </div>
  );
}
