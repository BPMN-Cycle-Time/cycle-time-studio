import { Home, PanelLeftClose, PanelLeftOpen, Plus, Workflow } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

import { AppTooltip, Button } from "@/components/ui";

interface SidebarHeaderProps {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  onCreateProject: () => void;
}

export function SidebarHeader({
  collapsed,
  onCollapsedChange,
  onCreateProject,
}: SidebarHeaderProps) {
  const t = useTranslations("Sidebar");

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-2.5 pt-3 pb-2 px-1 border-b border-border/40">
        <AppTooltip content="Cycle Time" side="right">
          <Button variant="ghost" size="icon" className="size-9 rounded-xl" asChild>
            <Link href="/">
              <Workflow className="size-4 text-primary" />
            </Link>
          </Button>
        </AppTooltip>

        <AppTooltip content={t("expandSidebar")} side="right">
          <Button
            variant="ghost"
            size="icon"
            className="size-9 rounded-xl"
            onClick={() => onCollapsedChange(false)}
          >
            <PanelLeftOpen className="size-4" />
          </Button>
        </AppTooltip>

        <AppTooltip content={t("newTask")} side="right">
          <Button
            size="icon"
            className="size-9 rounded-xl bg-foreground text-background hover:bg-foreground/90 mt-1"
            onClick={onCreateProject}
          >
            <Plus className="size-4 stroke-[2.5]" />
          </Button>
        </AppTooltip>
      </div>
    );
  }

  return (
    <div className="px-3.5 pt-4 pb-3 flex flex-col gap-3 shrink-0">
      {/* Top row: Brand & quick action buttons */}
      <div className="flex items-center justify-between gap-1">
        <Link href="/" className="flex items-center gap-2 group min-w-0">
          <Workflow className="size-4 shrink-0 text-primary" />
          <span className="font-bold text-lg tracking-tight text-foreground font-sans">
            Cycle Time
          </span>
        </Link>
        <div className="flex items-center gap-0.5 text-muted-foreground">
          <AppTooltip content={t("home")}>
            <Button variant="ghost" size="icon" className="size-7 rounded-lg" asChild>
              <Link href="/">
                <Home className="size-3.5" />
              </Link>
            </Button>
          </AppTooltip>

          {/* <AppTooltip content={t("notifications")}>
            <Button variant="ghost" size="icon" className="size-7 rounded-lg">
              <Bell className="size-3.5" />
            </Button>
          </AppTooltip> */}

          <AppTooltip content={t("collapseSidebar")}>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 rounded-lg"
              onClick={() => onCollapsedChange(true)}
            >
              <PanelLeftClose className="size-3.5" />
            </Button>
          </AppTooltip>
        </div>
      </div>

      {/* Segmented quick-toolbar */}
      {/* <div className="bg-muted/70 dark:bg-muted/40 p-1 rounded-2xl flex items-center justify-between text-muted-foreground">
        <AppTooltip content={t("process")}>
          <button
            type="button"
            className="flex items-center justify-center size-7 rounded-lg hover:bg-background/80 hover:text-foreground text-foreground transition-all cursor-pointer"
          >
            <MessageSquare className="size-3.5" />
          </button>
        </AppTooltip>

        <AppTooltip content={t("share")}>
          <button
            type="button"
            className="flex items-center justify-center size-7 rounded-lg hover:bg-background/80 hover:text-foreground transition-all cursor-pointer"
          >
            <Share2 className="size-3.5" />
          </button>
        </AppTooltip>

        <AppTooltip content={t("dataTable")}>
          <button
            type="button"
            className="flex items-center justify-center size-7 rounded-lg hover:bg-background/80 hover:text-foreground transition-all cursor-pointer"
          >
            <Table2 className="size-3.5" />
          </button>
        </AppTooltip>

        <AppTooltip content={t("vault")}>
          <button
            type="button"
            className="flex items-center justify-center size-7 rounded-lg hover:bg-background/80 hover:text-foreground transition-all cursor-pointer"
          >
            <FolderGit2 className="size-3.5" />
          </button>
        </AppTooltip>

        <AppTooltip content={t("apps")}>
          <button
            type="button"
            className="flex items-center justify-center size-7 rounded-lg hover:bg-background/80 hover:text-foreground transition-all cursor-pointer"
          >
            <LayoutGrid className="size-3.5" />
          </button>
        </AppTooltip>
      </div> */}

      {/* Action button: + Tác vụ mới */}
      <Button
        onClick={onCreateProject}
        variant="ghost"
        className="w-full justify-start gap-2.5 h-10 px-3 rounded-2xl bg-muted/60 hover:bg-muted dark:bg-muted/50 dark:hover:bg-muted text-foreground border-none font-medium text-xs shadow-none transition-all"
      >
        <span className="size-5 rounded-full bg-foreground text-background flex items-center justify-center shrink-0">
          <Plus className="size-3 stroke-[2.5]" />
        </span>
        <span className="truncate">{t("newTask")}</span>
      </Button>
    </div>
  );
}
