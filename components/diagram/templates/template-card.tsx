"use client";

import { useTranslations } from "next-intl";
import { Layers } from "lucide-react";
import type { ProcessTemplate } from "@/types";
import { Card, CardContent, Button } from "@/components/ui";

interface TemplateCardProps {
  template: ProcessTemplate;
  stepCount: number;
  onApply: () => void;
}

export function TemplateCard({ template, stepCount, onApply }: TemplateCardProps) {
  const t = useTranslations("templates");

  return (
    <Card className="flex flex-col">
      <CardContent className="p-4 flex-1 flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Layers className="size-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">{t(template.nameKey)}</h3>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {t(template.descriptionKey)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="font-mono">{t("stepCount", { count: stepCount })}</span>
          <span>·</span>
          <span className="font-mono">{t("taskCount", { count: template.tasks.length })}</span>
        </div>

        <Button size="sm" onClick={onApply} className="w-full text-xs mt-auto">
          {t("applyTemplate")}
        </Button>
      </CardContent>
    </Card>
  );
}
