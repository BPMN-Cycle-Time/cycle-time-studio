"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { DeleteProjectDialog } from "@/components/layout/project-sidebar/delete-project-dialog";
import { NewProjectDialog } from "@/components/layout/project-sidebar/new-project-dialog";
import { SidebarFooter } from "@/components/layout/project-sidebar/sidebar-footer";
import { SidebarHeader } from "@/components/layout/project-sidebar/sidebar-header";
import { SidebarProjectList } from "@/components/layout/project-sidebar/sidebar-project-list";
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
      {/* Inline Transition Sidebar */}
      <aside
        className={cn(
          "shrink-0 border-r bg-card/45 backdrop-blur-md flex flex-col h-svh sticky top-0 z-10 transition-all duration-300 ease-in-out overflow-hidden shadow-sm",
          collapsed ? "w-14" : "w-64",
        )}
      >
        <SidebarHeader collapsed={collapsed} onCollapsedChange={setCollapsed} />
        <SidebarProjectList
          activeId={activeId}
          collapsed={collapsed}
          hydrated={hydrated}
          projects={projects}
          onDeleteProject={setPendingDelete}
        />
        <SidebarFooter collapsed={collapsed} onCreateProject={() => setNewProjectOpen(true)} />
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
