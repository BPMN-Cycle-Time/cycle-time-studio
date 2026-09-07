"use client";

import React, { type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { AppCard } from "@/components/ui";
import { cn } from "@/utils";

export interface KpiStatCardProps {
  label: string;
  value: ReactNode;
  unit?: string;
  description?: ReactNode;
  icon: LucideIcon;
  iconColorClassName?: string;
  valueColorClassName?: string;
  className?: string;
}

export const KpiStatCard = React.memo(function KpiStatCard({
  label,
  value,
  unit,
  description,
  icon: Icon,
  iconColorClassName = "text-primary bg-primary/10",
  valueColorClassName,
  className,
}: KpiStatCardProps) {
  return (
    <AppCard
      className={cn(
        "p-4 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-shadow",
        className,
      )}
      contentClassName="p-0"
    >
      <div className="flex items-center justify-between gap-1.5 mb-1.5">
        <span
          className="text-[11px] font-semibold capitalize tracking-wider text-muted-foreground truncate"
          title={label}
        >
          {label}
        </span>
        <div className={cn("p-1 rounded-md shrink-0", iconColorClassName)}>
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>

      <div>
        <div className="flex items-baseline gap-1.5">
          <span
            className={cn(
              "text-xl font-bold font-mono tracking-tight text-foreground truncate",
              valueColorClassName,
            )}
          >
            {value}
          </span>
          {unit && <span className="text-[11px] text-muted-foreground font-medium">{unit}</span>}
        </div>

        {description && (
          <p
            className="text-xs text-muted-foreground mt-1 truncate"
            title={typeof description === "string" ? description : undefined}
          >
            {description}
          </p>
        )}
      </div>
    </AppCard>
  );
});
