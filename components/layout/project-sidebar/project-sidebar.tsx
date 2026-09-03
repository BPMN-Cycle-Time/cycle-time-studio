"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { DeleteProjectDialog } from "./delete-project-dialog";
import { NewProjectDialog } from "./new-project-dialog";
import { SidebarFooter } from "./sidebar-footer";
import { SidebarHeader } from "./sidebar-header";
import { SidebarProjectList } from "./sidebar-project-list";
import { useLocalStorageState, useHydration } from "@/hooks";
import { useProjectsIndex } from "@/store/useProjectsIndex";
import { cn } from "@/utils";

export function ProjectSidebar() {
  const { projects, createProject, deleteProject } = useProjectsIndex();
  const router = useRouter();
  const pathname = usePathname();
  const activeId = pathname?.startsWith("/project/") ? pathname.split("/")[2] : null;
  const [collapsed, setCollapsed] = useLocalStorageState("sidebar:collapsed", false);
  const hydrated = useHydration();
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);

  return (
    <>
      {/* Inline Transition Floating Sidebar */}
      <aside
        className={cn(
          "shrink-0 rounded-xl border border-border/70 bg-card shadow-sm flex flex-col h-[calc(100svh-1.5rem)] my-3 ml-3 sticky top-3 z-20 transition-all duration-300 ease-in-out overflow-hidden",
          collapsed ? "w-16" : "w-72",
        )}
      >
        <SidebarHeader
          collapsed={collapsed}
          onCollapsedChange={setCollapsed}
          onCreateProject={() => setNewProjectOpen(true)}
        />
        <SidebarProjectList
          activeId={activeId}
          collapsed={collapsed}
          hydrated={hydrated}
          projects={projects}
          onDeleteProject={setPendingDelete}
        />
        <SidebarFooter collapsed={collapsed} />
      </aside>

      <NewProjectDialog
        open={newProjectOpen}
        onOpenChange={setNewProjectOpen}
        onCreateProject={createProject}
      />
      <DeleteProjectDialog
        project={pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        onDeleteProject={(id) => {
          deleteProject(id);
          setPendingDelete(null);
          if (id === activeId) {
            router.push("/");
          }
        }}
      />
    </>
  );
}
