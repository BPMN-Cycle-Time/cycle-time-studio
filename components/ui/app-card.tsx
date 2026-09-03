"use client";

import type { ReactNode } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./card";
import { cn } from "@/utils";

export interface AppCardProps {
  title?: ReactNode;
  titleClassName?: string;
  description?: ReactNode;
  headerExtra?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  className?: string;
  contentClassName?: string;
  headerClassName?: string;
  variant?: "default" | "dashed" | "subtle";
}

export function AppCard({
  title,
  titleClassName,
  description,
  headerExtra,
  footer,
  children,
  className,
  contentClassName,
  headerClassName,
  variant = "default",
}: AppCardProps) {
  const variantStyles = {
    default: "",
    dashed: "border-dashed",
    subtle: "bg-muted/40 border-none shadow-none",
  };

  const hasHeader = title || description || headerExtra;

  return (
    <Card className={cn(variantStyles[variant], className)}>
      {hasHeader && (
        <CardHeader
          className={cn(
            headerExtra && "flex flex-row items-center justify-between gap-2",
            headerClassName,
          )}
        >
          <div>
            {title && (
              <CardTitle
                className={cn(
                  "text-xs uppercase tracking-wide text-muted-foreground font-medium whitespace-nowrap",
                  titleClassName,
                )}
              >
                {title}
              </CardTitle>
            )}
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {headerExtra && <div>{headerExtra}</div>}
        </CardHeader>
      )}

      {children && <CardContent className={contentClassName}>{children}</CardContent>}

      {footer && <CardFooter>{footer}</CardFooter>}
    </Card>
  );
}
