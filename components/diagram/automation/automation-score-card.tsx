"use client";

import { useTranslations } from "next-intl";
import { Bot, TrendingUp, Clock, Activity } from "lucide-react";
import type { AutomationCandidate, AutomationTag } from "@/types";
import { Card, CardContent, Badge } from "@/components/ui";

interface AutomationScoreCardProps {
  candidate: AutomationCandidate;
  rank: number;
  unit: string;
}

export function AutomationScoreCard({ candidate, rank, unit }: AutomationScoreCardProps) {
  const t = useTranslations("automation");

  const tagConfig: Record<
    AutomationTag,
    { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
  > = {
    highFrequency: { label: t("tagHighFrequency"), variant: "default" },
    lowVariance: { label: t("tagLowVariance"), variant: "secondary" },
    ruleBased: { label: t("tagRuleBased"), variant: "outline" },
    systemTask: { label: t("tagSystemTask"), variant: "default" },
    highTimeSavings: { label: t("tagHighTimeSavings"), variant: "destructive" },
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3.5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-primary">#{rank}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{candidate.activity}</p>
              <p className="text-[11px] text-muted-foreground">
                {t("score")}:{" "}
                <span className="font-mono font-medium text-foreground">
                  {candidate.score.composite}
                </span>
              </p>
            </div>
          </div>
          <Bot className="size-4 text-muted-foreground shrink-0" />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="p-2 rounded-lg bg-muted/50">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-0.5">
              <Activity className="size-3" />
              {t("frequency")}
            </div>
            <span className="text-xs font-mono font-medium">{candidate.frequency}</span>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-0.5">
              <Clock className="size-3" />
              {t("avgDuration")}
            </div>
            <span className="text-xs font-mono font-medium">
              {candidate.avgDuration} {unit}
            </span>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-0.5">
              <TrendingUp className="size-3" />
              {t("hoursSaved")}
            </div>
            <span className="text-xs font-mono font-medium">{candidate.estimatedHoursSaved}</span>
          </div>
        </div>

        {candidate.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {candidate.tags.map((tag) => (
              <Badge key={tag} variant={tagConfig[tag].variant} className="text-[10px] px-1.5 py-0">
                {tagConfig[tag].label}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
