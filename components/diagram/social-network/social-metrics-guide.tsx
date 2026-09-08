"use client";

import { useTranslations } from "next-intl";
import { BookOpen } from "lucide-react";
import { AppCard } from "@/components/ui";

const METRICS = [
  {
    titleKey: "cardDegreeTitle",
    descKey: "cardDegreeDesc",
  },
  {
    titleKey: "cardBetweennessTitle",
    descKey: "cardBetweennessDesc",
  },
  {
    titleKey: "cardClosenessTitle",
    descKey: "cardClosenessDesc",
  },
] as const;

export function SocialMetricsGuide() {
  const tDiag = useTranslations("diagram");

  return (
    <AppCard className="bg-card/80 flex flex-col gap-3 shadow-xs mb-3">
      <div className="flex items-center gap-1.5 border-b border-border/50 pb-2.5">
        <BookOpen className="w-3.5 h-3.5 text-primary" />
        <h4 className="text-xs font-semibold capitalize tracking-wider text-muted-foreground">
          {tDiag("metricsGuideTitle")}
        </h4>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mt-3">
        {METRICS.map(({ titleKey, descKey }) => (
          <div
            key={titleKey}
            className="p-2.5 rounded-lg bg-muted/30 border border-border/40 flex flex-col gap-1"
          >
            <h5 className="text-xs font-semibold text-foreground tracking-tight">
              {tDiag(titleKey)}
            </h5>
            <p className="text-[11px] leading-relaxed text-muted-foreground">{tDiag(descKey)}</p>
          </div>
        ))}
      </div>
    </AppCard>
  );
}
