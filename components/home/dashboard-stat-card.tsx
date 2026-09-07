import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/utils";

export interface DashboardStatCardProps {
  title: string;
  value: string | number;
  badge: ReactNode;
  icon: LucideIcon;
  variant?: "primary" | "default";
}

export function DashboardStatCard({
  title,
  value,
  badge,
  icon: Icon,
  variant = "default",
}: DashboardStatCardProps) {
  const isPrimary = variant === "primary";

  return (
    <div
      className={cn(
        "rounded-2xl p-4.5 flex flex-col justify-between min-h-[130px] transition-all",
        isPrimary
          ? "bg-primary text-primary-foreground shadow-[0_4px_18px_rgba(22,104,56,0.22)] relative overflow-hidden"
          : "bg-card border border-border/80 text-foreground shadow-xs hover:border-primary/30",
      )}
    >
      {/* Header Row: Title & Top Icon */}
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "text-xs font-semibold tracking-tight",
            isPrimary ? "text-primary-foreground/90" : "text-muted-foreground",
          )}
        >
          {title}
        </span>
        <div
          className={cn(
            "size-6 rounded-full flex items-center justify-center shrink-0",
            isPrimary ? "bg-white/20 text-white" : "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="size-3.5" />
        </div>
      </div>

      {/* Main Value */}
      <div
        className={cn(
          "text-3xl sm:text-4xl font-extrabold tracking-tight mt-1",
          isPrimary ? "text-white" : "text-foreground",
        )}
      >
        {value}
      </div>

      {/* Bottom Badge / Tag */}
      <div className="mt-2">{badge}</div>
    </div>
  );
}
