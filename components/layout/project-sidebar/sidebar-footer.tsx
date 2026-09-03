import { useTranslations } from "next-intl";
import { User } from "lucide-react";

import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface SidebarFooterProps {
  collapsed: boolean;
}

export function SidebarFooter({ collapsed }: SidebarFooterProps) {
  const t = useTranslations("Sidebar");

  if (collapsed) {
    return (
      <div className="mt-auto pt-2 pb-3 flex flex-col items-center gap-2 border-t border-border/40">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="size-8 rounded-full bg-primary/10 border border-border flex items-center justify-center font-semibold text-[10px] text-primary cursor-pointer">
              TPS
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">
            {t("userName")} — {t("userRole")}
          </TooltipContent>
        </Tooltip>
        <ThemeToggle />
        <LocaleSwitcher />
      </div>
    );
  }

  return (
    <div className="mt-auto px-3 py-3 border-t border-border/40 flex items-center justify-between gap-2 shrink-0">
      <div className="flex items-center gap-2.5 min-w-0">
        {/* User Avatar */}
        <div className="size-8 rounded-full bg-muted-foreground/15 border border-border/80 flex items-center justify-center font-semibold text-[11px] text-foreground shrink-0 overflow-hidden relative">
          <User className="size-4 text-muted-foreground" />
          <span className="absolute bottom-0 right-0 size-2 bg-emerald-500 rounded-full ring-1 ring-background" />
        </div>

        {/* User Info */}
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-semibold text-foreground truncate leading-tight">
            {t("userName")}
          </span>
          <span className="text-[10px] text-muted-foreground truncate leading-tight">
            {t("userRole")}
          </span>
        </div>
      </div>

      {/* Toggles */}
      <div className="flex items-center gap-0.5 shrink-0">
        <ThemeToggle />
        <LocaleSwitcher />
      </div>
    </div>
  );
}
