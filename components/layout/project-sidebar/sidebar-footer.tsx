import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";

import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface SidebarFooterProps {
  collapsed: boolean;
  onCreateProject: () => void;
}

export function SidebarFooter({ collapsed, onCreateProject }: SidebarFooterProps) {
  const t = useTranslations("Sidebar");

  if (collapsed) {
    return (
      <div className="mt-auto border-t py-3 flex flex-col items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" onClick={onCreateProject}>
              <Plus className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">{t("newProject")}</TooltipContent>
        </Tooltip>
        <LocaleSwitcher />
        <ThemeToggle />
      </div>
    );
  }

  return (
    <div className="mt-auto border-t p-3 flex items-center gap-2">
      <Button className="flex-1" size="sm" onClick={onCreateProject}>
        <Plus /> {t("newProject")}
      </Button>
      <LocaleSwitcher />
      <ThemeToggle />
    </div>
  );
}
