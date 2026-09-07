"use client";

import Link from "next/link";
import { useStore } from "zustand";
import { useTranslations } from "next-intl";
import { Undo2, Redo2, PanelRightOpen, ChevronRight, LayoutDashboard } from "lucide-react";
import { useEditorStore } from "@/store/useEditorStore";
import { Input, Button, AppTooltip } from "@/components/ui";
import { ThemeToggle, LocaleSwitcher } from "@/components/layout";

interface ProjectHeaderProps {
  rightCollapsed: boolean;
  onExpandRightPanel: () => void;
}

export function ProjectHeader({ rightCollapsed, onExpandRightPanel }: ProjectHeaderProps) {
  const tBtn = useTranslations("common.buttons");
  const tEd = useTranslations("editor");
  const tDiag = useTranslations("diagram");
  const { project, setName } = useEditorStore();
  const undo = useStore(useEditorStore.temporal, (s) => s.undo);
  const redo = useStore(useEditorStore.temporal, (s) => s.redo);
  const pastLen = useStore(useEditorStore.temporal, (s) => s.pastStates.length);
  const futureLen = useStore(useEditorStore.temporal, (s) => s.futureStates.length);

  if (!project) return null;

  return (
    <div className="flex items-center justify-between gap-3 mb-3 px-3.5 py-2 rounded-2xl bg-card border border-border/80 shadow-2xs">
      {/* Breadcrumb: Home / Project Name */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <AppTooltip content={tDiag("activityBarHomeTooltip")}>
          <Link
            href="/"
            className="shrink-0 size-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            aria-label={tDiag("activityBarHomeTooltip")}
          >
            <LayoutDashboard className="size-3.5" />
          </Link>
        </AppTooltip>

        <ChevronRight className="size-3 text-muted-foreground/60 shrink-0" />

        <Input
          className="flex-1 font-bold text-sm h-8 border-transparent hover:border-input focus-visible:border-primary shadow-none px-2 tracking-tight min-w-0"
          value={project.name}
          onChange={(e) => setName(e.target.value)}
        />
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
