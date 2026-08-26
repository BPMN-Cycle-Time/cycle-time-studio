"use client";

import * as React from "react";
import { Label } from "./label";
import { cn } from "@/utils";

export interface AppLabelProps extends React.ComponentProps<typeof Label> {
  variant?: "default" | "field" | "caption" | "uppercase";
  required?: boolean;
  optional?: boolean;
}

export function AppLabel({
  children,
  className,
  variant = "default",
  required,
  optional,
  ...props
}: AppLabelProps) {
  const variantClasses = {
    default: "text-xs font-medium text-foreground",
    field: "text-xs font-normal text-muted-foreground",
    caption: "text-[11px] text-muted-foreground",
    uppercase:
      "text-[10px] font-medium uppercase text-muted-foreground tracking-wider mb-1 block select-none",
  }[variant];

  return (
    <Label className={cn(variantClasses, className)} {...props}>
      {children}
      {required && <span className="text-destructive ml-0.5">*</span>}
      {optional && (
        <span className="text-muted-foreground/60 text-[10px] ml-1 font-normal font-sans">
          (optional)
        </span>
      )}
    </Label>
  );
}
