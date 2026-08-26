"use client";

import type { ComponentProps, ReactNode } from "react";
import { Input } from "./input";
import { Label } from "./label";
import { cn } from "@/utils";

export interface AppInputProps extends Omit<ComponentProps<"input">, "prefix"> {
  label?: ReactNode;
  required?: boolean;
  error?: string;
  hint?: ReactNode;
  prefix?: ReactNode;
  suffix?: ReactNode;
  layout?: "horizontal" | "vertical";
  wrapperClassName?: string;
  labelClassName?: string;
  inputClassName?: string;
}

export function AppInput({
  label,
  required,
  error,
  hint,
  prefix,
  suffix,
  layout = "vertical",
  wrapperClassName,
  labelClassName,
  inputClassName,
  className,
  id,
  type = "text",
  ...props
}: AppInputProps) {
  const isHorizontal = layout === "horizontal";

  const inputElement = (
    <div className="relative flex items-center w-full">
      {prefix && (
        <span className="absolute left-2 text-xs text-muted-foreground pointer-events-none select-none z-10">
          {prefix}
        </span>
      )}
      <Input
        id={id}
        type={type}
        className={cn(
          prefix && "pl-6",
          suffix && "pr-6",
          error && "border-destructive focus-visible:ring-destructive",
          inputClassName,
          className,
        )}
        {...props}
      />
      {suffix && (
        <span className="absolute right-2 text-xs text-muted-foreground pointer-events-none select-none z-10 font-sans">
          {suffix}
        </span>
      )}
    </div>
  );

  return (
    <div
      className={cn(
        "w-full flex",
        isHorizontal ? "flex-row items-center gap-2" : "flex-col gap-1.5",
        wrapperClassName,
      )}
    >
      {label && (
        <Label
          htmlFor={id}
          className={cn(
            "text-muted-foreground font-normal text-xs shrink-0",
            error && "text-destructive",
            labelClassName,
          )}
        >
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
      )}

      {inputElement}

      {error && <p className="text-[0.75rem] font-medium text-destructive">{error}</p>}
      {!error && hint && <p className="text-[0.75rem] text-muted-foreground">{hint}</p>}
    </div>
  );
}
