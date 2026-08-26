import Link from "next/link";
import { useTranslations } from "next-intl";
import { PanelLeftClose, PanelLeftOpen, Workflow } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface SidebarHeaderProps {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

export function SidebarHeader({ collapsed, onCollapsedChange }: SidebarHeaderProps) {
  const t = useTranslations("Sidebar");

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-2 border-b py-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" asChild>
              <Link href="/">
                <Workflow className="size-4 text-primary" />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Cycle Time Studio</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => onCollapsedChange(false)}>
              <PanelLeftOpen className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">{t("expandSidebar")}</TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 border-b flex items-center justify-between gap-2">
      <Link href="/" className="flex items-center gap-2 min-w-0">
        <Workflow className="size-4 shrink-0 text-primary" />
        <span className="font-semibold text-sm truncate">Cycle Time Studio</span>
      </Link>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" onClick={() => onCollapsedChange(true)}>
            <PanelLeftClose className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t("collapseSidebar")}</TooltipContent>
      </Tooltip>
    </div>
  );
}
