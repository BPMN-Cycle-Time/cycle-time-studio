"use client";

import Link from "next/link";
import { useStore } from "zustand";
import { useTranslations } from "next-intl";
import { Undo2, Redo2, PanelRightOpen, ChevronRight } from "lucide-react";
import { useEditorStore } from "@/store/useEditorStore";
import { Button, AppTooltip } from "@/components/ui";
import { ThemeToggle, LocaleSwitcher } from "@/components/layout";

interface ProjectHeaderProps {
  rightCollapsed: boolean;
  onExpandRightPanel: () => void;
}

export function ProjectHeader({ rightCollapsed, onExpandRightPanel }: ProjectHeaderProps) {
  const tBtn = useTranslations("common.buttons");
  const tEd = useTranslations("editor");
  const { project } = useEditorStore();
  const undo = useStore(useEditorStore.temporal, (s) => s.undo);
  const redo = useStore(useEditorStore.temporal, (s) => s.redo);
  const pastLen = useStore(useEditorStore.temporal, (s) => s.pastStates.length);
  const futureLen = useStore(useEditorStore.temporal, (s) => s.futureStates.length);

  if (!project) return null;

  return (
    <div className="flex items-center justify-between gap-3 mb-3 px-3.5 py-2 rounded-2xl bg-card border border-border/80 shadow-2xs">
      {/* Breadcrumb: Dashboard / Project Name */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <Link
          href="/"
          className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer px-1 py-0.5"
        >
          {tEd("dashboard")}
        </Link>

        <ChevronRight className="size-3 text-muted-foreground/60 shrink-0" />

        <span
          className="font-bold text-sm tracking-tight text-foreground truncate px-1 select-none"
          title={project.name}
        >
          {project.name}
        </span>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1 shrink-0">
        <AppTooltip content={tBtn("undo")}>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70"
            onClick={() => undo()}
            disabled={pastLen === 0}
          >
            <Undo2 className="size-4" />
          </Button>
        </AppTooltip>

        <AppTooltip content={tBtn("redo")}>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70"
            onClick={() => redo()}
            disabled={futureLen === 0}
          >
            <Redo2 className="size-4" />
          </Button>
        </AppTooltip>

        <div className="w-px h-4 bg-border/60 mx-1" />

        <LocaleSwitcher />
        <ThemeToggle />

        {rightCollapsed && (
          <AppTooltip content={tEd("showParameters")}>
            <Button
              variant="outline"
              size="icon"
              className="size-8 rounded-lg border-border/80 hover:border-primary/40 hover:bg-primary/5 shadow-2xs"
              onClick={onExpandRightPanel}
            >
              <PanelRightOpen className="size-4" />
            </Button>
          </AppTooltip>
        )}
      </div>
    </div>
  );
}
