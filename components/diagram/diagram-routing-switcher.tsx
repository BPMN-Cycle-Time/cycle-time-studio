"use client";

import { Button } from "@/components/ui";
import { EdgeRoutingStyle } from "@/services/graph";
import { CornerDownRight, Spline, MoveRight } from "lucide-react";
import { useTranslations } from "next-intl";

interface DiagramRoutingSwitcherProps {
  style: EdgeRoutingStyle;
  onChange: (style: EdgeRoutingStyle) => void;
}

export function DiagramRoutingSwitcher({ style, onChange }: DiagramRoutingSwitcherProps) {
  const t = useTranslations("diagram");

  return (
    <div className="inline-flex items-center p-0.5 bg-muted/60 rounded-md border border-border/80">
      <Button
        variant={style === EdgeRoutingStyle.ORTHOGONAL ? "secondary" : "ghost"}
        size="sm"
        onClick={() => onChange(EdgeRoutingStyle.ORTHOGONAL)}
        className="h-7 px-2 text-[11px] font-medium gap-1 shadow-none"
        title={t("routingOrthogonal")}
      >
        <CornerDownRight className="size-3.5" />
        <span className="hidden md:inline">{t("routingOrthogonal")}</span>
      </Button>

      <Button
        variant={style === EdgeRoutingStyle.CURVED ? "secondary" : "ghost"}
        size="sm"
        onClick={() => onChange(EdgeRoutingStyle.CURVED)}
        className="h-7 px-2 text-[11px] font-medium gap-1 shadow-none"
        title={t("routingCurved")}
      >
        <Spline className="size-3.5" />
        <span className="hidden md:inline">{t("routingCurved")}</span>
      </Button>

      <Button
        variant={style === EdgeRoutingStyle.STRAIGHT ? "secondary" : "ghost"}
        size="sm"
        onClick={() => onChange(EdgeRoutingStyle.STRAIGHT)}
        className="h-7 px-2 text-[11px] font-medium gap-1 shadow-none"
        title={t("routingStraight")}
      >
        <MoveRight className="size-3.5" />
        <span className="hidden md:inline">{t("routingStraight")}</span>
      </Button>
    </div>
  );
}
