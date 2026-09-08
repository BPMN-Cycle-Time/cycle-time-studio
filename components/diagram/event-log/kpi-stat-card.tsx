"use client";

import React, { type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/utils";

export interface KpiStatCardProps {
  label: string;
  value: ReactNode;
  unit?: string;
  tag?: string;
  description?: ReactNode;
  icon: LucideIcon;
  accentColor?: "indigo" | "emerald" | "amber" | "violet" | "sky" | "rose";
  className?: string;
}

const ACCENT_CONFIG = {
  indigo: {
    iconBg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/25",
    gradient: "from-indigo-500/[0.08] via-transparent to-transparent",
    borderHover: "hover:border-indigo-500/40 hover:shadow-[0_4px_16px_rgba(99,102,241,0.08)]",
    badgeBg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
  },
  emerald: {
    iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
    gradient: "from-emerald-500/[0.08] via-transparent to-transparent",
    borderHover: "hover:border-emerald-500/40 hover:shadow-[0_4px_16px_rgba(16,185,129,0.08)]",
    badgeBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  amber: {
    iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
    gradient: "from-amber-500/[0.08] via-transparent to-transparent",
    borderHover: "hover:border-amber-500/40 hover:shadow-[0_4px_16px_rgba(245,158,11,0.08)]",
    badgeBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  violet: {
    iconBg: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/25",
    gradient: "from-violet-500/[0.08] via-transparent to-transparent",
    borderHover: "hover:border-violet-500/40 hover:shadow-[0_4px_16px_rgba(139,92,246,0.08)]",
    badgeBg: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  },
  sky: {
    iconBg: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25",
    gradient: "from-sky-500/[0.08] via-transparent to-transparent",
    borderHover: "hover:border-sky-500/40 hover:shadow-[0_4px_16px_rgba(14,165,233,0.08)]",
    badgeBg: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
  },
  rose: {
    iconBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25",
    gradient: "from-rose-500/[0.08] via-transparent to-transparent",
    borderHover: "hover:border-rose-500/40 hover:shadow-[0_4px_16px_rgba(244,63,94,0.08)]",
    badgeBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  },
};

export const KpiStatCard = React.memo(function KpiStatCard({
  label,
  value,
  unit,
  tag,
  description,
  icon: Icon,
  accentColor = "indigo",
  className,
}: KpiStatCardProps) {
  const accent = ACCENT_CONFIG[accentColor] ?? ACCENT_CONFIG.indigo;

  return (
    <div
      className={cn(
        "group relative rounded-2xl border border-border/80 bg-card p-3.5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs flex flex-col justify-between overflow-hidden min-h-[108px]",
        accent.borderHover,
        className,
      )}
    >
      {/* Background ambient radial glow */}
      <div
        className={cn(
          "pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-gradient-to-br blur-xl opacity-60 transition-opacity duration-300 group-hover:opacity-100",
          accent.gradient,
        )}
      />

      {/* Header Row: Label & Icon */}
      <div className="relative flex items-center justify-between gap-1.5 z-10">
        <span
          className="text-xs font-semibold text-muted-foreground tracking-tight truncate group-hover:text-foreground transition-colors"
          title={label}
        >
          {label}
        </span>
        <div
          className={cn(
            "size-7 rounded-xl flex items-center justify-center shrink-0 border transition-transform duration-200 group-hover:scale-105 shadow-2xs",
            accent.iconBg,
          )}
        >
          <Icon className="size-3.5" />
        </div>
      </div>

      {/* Main Value & Unit */}
      <div className="relative mt-2 z-10 flex flex-col gap-1">
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-extrabold tracking-tight text-foreground tabular-nums">
            {value}
          </span>
          {unit && <span className="text-xs font-medium text-muted-foreground">{unit}</span>}
        </div>

        {/* Micro-badge Tag or Description */}
        {tag ? (
          <span
            className={cn(
              "inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-md border w-fit mt-0.5",
              accent.badgeBg,
            )}
          >
            {tag}
          </span>
        ) : description ? (
          <p
            className="text-[11px] text-muted-foreground mt-0.5 truncate"
            title={typeof description === "string" ? description : undefined}
          >
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
});
