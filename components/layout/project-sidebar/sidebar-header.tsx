import { PanelLeftClose, PanelLeftOpen, Workflow } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

import { AppTooltip, Button } from "@/components/ui";

interface SidebarHeaderProps {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  onCreateProject?: () => void;
}

export function SidebarHeader({ collapsed, onCollapsedChange }: SidebarHeaderProps) {
  const t = useTranslations("sidebar");
  const tCommon = useTranslations("common");

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-2.5 pt-3 pb-2 px-1 border-b border-border/40">
        <AppTooltip content={tCommon("appName")} side="right">
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
            className="size-9 rounded-xl text-muted-foreground hover:text-foreground"
            onClick={() => onCollapsedChange(false)}
          >
            <PanelLeftOpen className="size-4" />
          </Button>
        </AppTooltip>
      </div>
    );
  }

  return (
    <div className="px-3.5 pt-4 pb-3 flex flex-col gap-3 shrink-0">
      {/* Top row: Brand & Collapse action button */}
      <div className="flex items-center justify-between gap-1">
        <Link href="/" className="flex items-center gap-2 group min-w-0">
          <Workflow className="size-4 shrink-0 text-primary" />
          <span className="font-bold text-lg tracking-tight text-foreground font-sans">
            {tCommon("appName")}
          </span>
        </Link>
        <AppTooltip content={t("collapseSidebar")}>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70"
            onClick={() => onCollapsedChange(true)}
          >
            <PanelLeftClose className="size-3.5" />
          </Button>
        </AppTooltip>
      </div>
    </div>
  );
}
