"use client";

import type { ReactNode } from "react";
import { Tooltip, TooltipTrigger, TooltipContent } from "./tooltip";

export interface AppTooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  delayDuration?: number;
  className?: string;
  asChild?: boolean;
}

export function AppTooltip({
  content,
  children,
  side,
  align,
  delayDuration,
  className,
  asChild = true,
}: AppTooltipProps) {
  if (!content) return <>{children}</>;

  return (
    <Tooltip delayDuration={delayDuration}>
      <TooltipTrigger asChild={asChild}>{children}</TooltipTrigger>
      <TooltipContent side={side} align={align} className={className}>
        {content}
      </TooltipContent>
    </Tooltip>
  );
}
