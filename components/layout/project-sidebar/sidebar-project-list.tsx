import Link from "next/link";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";

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
      <nav className="flex-1 overflow-y-auto flex flex-col items-center gap-1.5 w-full px-2 py-3">
        {hydrated &&
          projects.map((project) => (
            <Tooltip key={project.id}>
              <TooltipTrigger asChild>
                <Button
                  variant={activeId === project.id ? "secondary" : "ghost"}
                  size="icon"
                  className="text-[0.65rem] font-mono"
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
    <nav className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-1">
      {hydrated && projects.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center px-2 py-6">{t("noProjects")}</p>
      ) : null}
      {hydrated
        ? projects.map((project) => (
            <div
              key={project.id}
              className={cn(
                "group flex items-center gap-1 rounded-md pr-1",
                activeId === project.id ? "bg-accent" : "hover:bg-accent/60",
              )}
            >
              <Link
                href={`/project/${project.id}`}
                className="flex-1 min-w-0 px-2.5 py-2 text-sm truncate"
                title={project.name}
              >
                {project.name}
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="size-6 shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                onClick={() => onDeleteProject({ id: project.id, name: project.name })}
                aria-label={t("deleteProject", { name: project.name })}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))
        : null}
    </nav>
  );
}
