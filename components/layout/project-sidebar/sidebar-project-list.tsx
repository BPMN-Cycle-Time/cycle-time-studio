import Link from "next/link";
import { useTranslations } from "next-intl";
import { MessageSquare, Trash2 } from "lucide-react";

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
  const t = useTranslations("Sidebar");

  if (collapsed) {
    return (
      <nav className="flex-1 overflow-y-auto flex flex-col items-center gap-2 w-full px-2 py-3">
        {hydrated &&
          projects.map((project) => (
            <Tooltip key={project.id}>
              <TooltipTrigger asChild>
                <Button
                  variant={activeId === project.id ? "secondary" : "ghost"}
                  size="icon"
                  className="size-9 rounded-xl text-[0.65rem] font-medium"
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
      {/* Section: Gần đây (Recent) */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between px-0.5 mb-1">
          <span className="font-bold text-xs text-foreground tracking-tight">{t("recent")}</span>
          <button
            type="button"
            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            {t("more")}
          </button>
        </div>

        {hydrated && projects.length === 0 ? (
          <p className="text-xs text-muted-foreground/75 px-0.5 py-2">{t("noProjects")}</p>
        ) : null}

        {hydrated
          ? projects.map((project) => (
              <div
                key={project.id}
                className={cn(
                  "group flex items-center gap-2 rounded-xl px-2 py-1.5 transition-all",
                  activeId === project.id
                    ? "bg-muted text-foreground font-medium"
                    : "hover:bg-muted/60 text-muted-foreground hover:text-foreground",
                )}
              >
                <div className="size-5 rounded-full bg-muted-foreground/10 flex items-center justify-center shrink-0">
                  <MessageSquare className="size-3 text-muted-foreground" />
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
                  className="size-6 shrink-0 opacity-0 group-hover:opacity-100 rounded-lg text-muted-foreground hover:text-destructive transition-opacity"
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
