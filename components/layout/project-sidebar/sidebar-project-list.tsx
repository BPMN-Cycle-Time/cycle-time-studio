import Link from "next/link";
import { useTranslations } from "next-intl";
import { LayoutDashboard, MessageSquare, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ProjectSummary } from "@/types";
import { cn } from "@/utils";

interface SidebarProjectListProps {
  activeId: string | null;
  collapsed: boolean;
  hydrated: boolean;
  projects: ProjectSummary[];
  onDeleteProject: (project: { id: string; name: string }) => void;
}

function getInitials(name: string) {
  return name.trim().slice(0, 2).toUpperCase() || "?";
}

export function SidebarProjectList({
  activeId,
  collapsed,
  hydrated,
  projects,
  onDeleteProject,
}: SidebarProjectListProps) {
  const t = useTranslations("sidebar");

  if (collapsed) {
    return (
      <nav className="flex-1 overflow-y-auto flex flex-col items-center gap-2 w-full px-2 py-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={activeId === null ? "default" : "ghost"}
              size="icon"
              className={cn(
                "size-9 rounded-xl transition-all",
                activeId === null && "bg-primary text-primary-foreground shadow-xs",
              )}
              asChild
            >
              <Link href="/">
                <LayoutDashboard className="size-4" />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">{t("dashboard")}</TooltipContent>
        </Tooltip>

        <div className="w-6 h-px bg-border/60 my-1" />

        {hydrated &&
          projects.map((project) => (
            <Tooltip key={project.id}>
              <TooltipTrigger asChild>
                <Button
                  variant={activeId === project.id ? "default" : "ghost"}
                  size="icon"
                  className={cn(
                    "size-9 rounded-xl text-[0.65rem] font-semibold transition-all",
                    activeId === project.id && "bg-primary text-primary-foreground shadow-xs",
                  )}
                  asChild
                >
                  <Link href={`/project/${project.id}`}>{getInitials(project.name)}</Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">{project.name}</TooltipContent>
            </Tooltip>
          ))}
      </nav>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-3.5 py-1 flex flex-col gap-4">
      {/* Section: MENU */}
      <div className="flex flex-col gap-1">
        <span className="font-bold text-[10px] tracking-wider text-muted-foreground/80 px-2 uppercase mb-1">
          {t("menu")}
        </span>
        <Link
          href="/"
          className={cn(
            "flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition-all duration-150 text-xs",
            activeId === null
              ? "bg-primary/12 text-primary font-bold border border-primary/20 shadow-2xs dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30"
              : "hover:bg-muted/70 text-muted-foreground hover:text-foreground font-medium",
          )}
        >
          <div
            className={cn(
              "size-5 rounded-full flex items-center justify-center shrink-0 transition-colors",
              activeId === null
                ? "bg-primary/20 text-primary dark:bg-emerald-500/25 dark:text-emerald-300"
                : "bg-muted-foreground/10 text-muted-foreground",
            )}
          >
            <LayoutDashboard className="size-3" />
          </div>
          <span className="flex-1 truncate">{t("dashboard")}</span>
        </Link>
      </div>

      {/* Section: RECENT PROJECTS */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between px-2 mb-1">
          <span className="font-bold text-[10px] tracking-wider text-muted-foreground/80 uppercase">
            {t("recent")}
          </span>
          <span className="text-[10px] font-mono text-muted-foreground/70 bg-muted/80 px-1.5 py-0.5 rounded-full font-medium">
            {hydrated ? projects.length : 0}
          </span>
        </div>

        {hydrated && projects.length === 0 ? (
          <p className="text-xs text-muted-foreground/75 px-0.5 py-2">{t("noProjects")}</p>
        ) : null}

        {hydrated
          ? projects.map((project) => (
              <div
                key={project.id}
                className={cn(
                  "group flex items-center gap-2 rounded-xl px-2.5 py-2 transition-all duration-150",
                  activeId === project.id
                    ? "bg-primary/12 text-primary font-semibold border border-primary/20 shadow-2xs dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30"
                    : "hover:bg-muted/70 text-muted-foreground hover:text-foreground",
                )}
              >
                <div
                  className={cn(
                    "size-5 rounded-full flex items-center justify-center shrink-0 transition-colors",
                    activeId === project.id
                      ? "bg-primary/20 text-primary dark:bg-emerald-500/25 dark:text-emerald-300"
                      : "bg-muted-foreground/10 text-muted-foreground",
                  )}
                >
                  <MessageSquare className="size-3" />
                </div>
                <Link
                  href={`/project/${project.id}`}
                  className="flex-1 min-w-0 text-xs truncate leading-snug"
                  title={project.name}
                >
                  {project.name}
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 shrink-0 opacity-0 group-hover:opacity-100 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/20 transition-all"
                  onClick={() => onDeleteProject({ id: project.id, name: project.name })}
                  aria-label={t("deleteProject", { name: project.name })}
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            ))
          : null}
      </div>
    </div>
  );
}
