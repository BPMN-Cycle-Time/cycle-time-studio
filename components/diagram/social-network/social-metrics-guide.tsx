"use client";

import { useTranslations } from "next-intl";
import { BookOpen } from "lucide-react";
import { AppCard } from "@/components/ui";

export function SocialMetricsGuide() {
  const tDiag = useTranslations("diagram");

  return (
    <AppCard className="p-3.5 bg-card/80 flex flex-col gap-2.5 shadow-xs border-border/70">
      <div className="flex items-center gap-1.5 border-b border-border/50 pb-2">
        <BookOpen className="w-3.5 h-3.5 text-primary" />
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {tDiag("cardDegreeTitle").split("·")[1]?.trim()
            ? "Metric Guide"
            : tDiag("cardDegreeTitle")}
        </h4>
      </div>

      <div className="flex flex-col gap-2">
        <div className="p-2.5 rounded-lg bg-muted/30 border border-border/40 flex flex-col gap-1">
          <h5 className="text-xs font-semibold text-foreground tracking-tight">
            {tDiag("cardDegreeTitle")}
          </h5>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {tDiag("cardDegreeDesc")}
          </p>
        </div>

        <div className="p-2.5 rounded-lg bg-muted/30 border border-border/40 flex flex-col gap-1">
          <h5 className="text-xs font-semibold text-foreground tracking-tight">
            {tDiag("cardBetweennessTitle")}
          </h5>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {tDiag("cardBetweennessDesc")}
          </p>
        </div>

        <div className="p-2.5 rounded-lg bg-muted/30 border border-border/40 flex flex-col gap-1">
          <h5 className="text-xs font-semibold text-foreground tracking-tight">
            {tDiag("cardClosenessTitle")}
          </h5>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {tDiag("cardClosenessDesc")}
          </p>
        </div>
      </div>
    </AppCard>
  );
}
