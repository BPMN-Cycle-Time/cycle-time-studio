"use client";

import { useStore } from "zustand";
import { useTranslations } from "next-intl";
import { Undo2, Redo2, PanelRightOpen } from "lucide-react";
import { useEditorStore } from "@/store/useEditorStore";
import { Input, Button, AppTooltip } from "@/components/ui";

interface ProjectHeaderProps {
  rightCollapsed: boolean;
  onExpandRightPanel: () => void;
}

export function ProjectHeader({ rightCollapsed, onExpandRightPanel }: ProjectHeaderProps) {
  const tBtn = useTranslations("common.buttons");
  const tEd = useTranslations("editor");
  const { project, setName } = useEditorStore();
  const undo = useStore(useEditorStore.temporal, (s) => s.undo);
  const redo = useStore(useEditorStore.temporal, (s) => s.redo);
  const pastLen = useStore(useEditorStore.temporal, (s) => s.pastStates.length);
  const futureLen = useStore(useEditorStore.temporal, (s) => s.futureStates.length);

  if (!project) return null;

  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <Input
        className="flex-1 font-semibold text-xl h-auto border-transparent hover:border-input focus-visible:border-input shadow-none px-1 py-1"
        value={project.name}
        onChange={(e) => setName(e.target.value)}
      />
      <div className="flex items-center gap-2 shrink-0">
        <AppTooltip content={tBtn("undo")}>
          <Button variant="outline" size="icon" onClick={() => undo()} disabled={pastLen === 0}>
            <Undo2 />
          </Button>
        </AppTooltip>

        <AppTooltip content={tBtn("redo")}>
          <Button variant="outline" size="icon" onClick={() => redo()} disabled={futureLen === 0}>
            <Redo2 />
          </Button>
        </AppTooltip>

        {rightCollapsed && (
          <AppTooltip content={tEd("showParameters")}>
            <Button variant="outline" size="icon" onClick={onExpandRightPanel}>
              <PanelRightOpen />
            </Button>
          </AppTooltip>
        )}
      </div>
    </div>
  );
}
