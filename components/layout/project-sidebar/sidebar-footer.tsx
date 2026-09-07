"use client";

import { useTranslations } from "next-intl";
import { Settings, HelpCircle } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

interface SidebarFooterProps {
  collapsed: boolean;
}

export function SidebarFooter({ collapsed }: SidebarFooterProps) {
  const t = useTranslations("Sidebar");

  if (collapsed) {
    return (
      <div className="mt-auto pt-2 pb-3 flex flex-col items-center gap-1.5 border-t border-border/40">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
            >
              <Settings className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">{t("settings")}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
            >
              <HelpCircle className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">{t("help")}</TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="mt-auto px-3.5 py-3 border-t border-border/40 flex flex-col gap-1 shrink-0">
      <span className="font-bold text-[10px] tracking-wider text-muted-foreground/80 px-2 uppercase mb-1">
        {t("general")}
      </span>
      <Button
        variant="ghost"
        size="sm"
        className="justify-start gap-2.5 rounded-xl px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground h-auto font-medium"
      >
        <Settings className="size-3.5 shrink-0" />
        <span>{t("settings")}</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="justify-start gap-2.5 rounded-xl px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground h-auto font-medium"
      >
        <HelpCircle className="size-3.5 shrink-0" />
        <span>{t("help")}</span>
      </Button>
    </div>
  );
}
