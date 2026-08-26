"use client";

import { useTranslations } from "next-intl";
import { Workflow } from "lucide-react";
import { AppCard } from "@/components/ui";

export function EmptyProjectsState() {
  const t = useTranslations("Home");

  return (
    <AppCard
      variant="dashed"
      contentClassName="text-muted-foreground text-sm text-center py-10 flex flex-col items-center gap-2"
    >
      <Workflow className="size-8 opacity-40" />
      {t("empty")}
    </AppCard>
  );
}
