"use client";

import { useEffect, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";

import { useEditorStore } from "@/store/useEditorStore";
import { useProjectsIndex } from "@/store/useProjectsIndex";
import { useLocalStorageState } from "@/hooks";
import { computeFlow } from "@/utils";
import { STORAGE_KEYS } from "@/constants";
import { ProjectSidebar } from "@/components/layout";
import { ProjectHeader, ProjectParametersDrawer } from "@/components/editor";
import { DiagramPanel } from "@/components/diagram";

interface ProjectContainerProps {
  id: string;
}

export function ProjectContainer({ id }: ProjectContainerProps) {
  const tStatus = useTranslations("common.status");
  const { project, loadProjectById } = useEditorStore();
  const { touch } = useProjectsIndex();
  const [rightCollapsed, setRightCollapsed] = useLocalStorageState(
    STORAGE_KEYS.RIGHT_PANEL_COLLAPSED,
    false,
  );

  useEffect(() => {
    loadProjectById(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (project) touch(project.id, project.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.name, project?.blocks]);

  const blocks = project?.blocks;
  const tasks = project?.tasks;
  const flow = useMemo(() => (blocks ? computeFlow(blocks, tasks) : null), [blocks, tasks]);

  const handleExpandRightPanel = useCallback(() => {
    setRightCollapsed(false);
  }, [setRightCollapsed]);

  return (
    <div className="flex h-svh overflow-hidden bg-muted/30 dark:bg-zinc-950/60">
      <ProjectSidebar />

      {!project ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground text-sm">{tStatus("loading")}</p>
        </div>
      ) : (
        <>
          {/* Middle column — diagram */}
          <div className="flex-1 min-w-[500px] flex flex-col h-svh overflow-hidden">
            <div className="w-full h-full px-5 py-3 flex-1 min-h-0 flex flex-col overflow-y-auto no-scrollbar">
              <ProjectHeader
                rightCollapsed={rightCollapsed}
                onExpandRightPanel={handleExpandRightPanel}
              />

              <DiagramPanel blocks={project.blocks} unit={project.unit} />
            </div>
          </div>

          {/* Right column — parameters drawer */}
          <ProjectParametersDrawer
            collapsed={rightCollapsed}
            onCollapsedChange={setRightCollapsed}
            project={project}
            flow={flow}
          />
        </>
      )}
    </div>
  );
}
