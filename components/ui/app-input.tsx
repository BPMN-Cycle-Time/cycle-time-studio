"use client";

import type { ComponentProps, ReactNode } from "react";
import { Input } from "./input";
import { AppLabel } from "./app-label";
import { cn } from "@/utils";

export interface AppInputProps extends Omit<ComponentProps<"input">, "prefix"> {
  label?: ReactNode;
  labelVariant?: "default" | "field" | "caption" | "uppercase";
  required?: boolean;
  optional?: boolean;
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
  labelVariant = "field",
  required,
  optional,
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

  const suffixPadding = suffix
    ? typeof suffix === "string" && suffix.length > 2
      ? "pr-10"
      : "pr-6"
    : "";

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
          error && "border-destructive focus-visible:ring-destructive",
          inputClassName,
          className,
          suffix && suffixPadding,
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
        isHorizontal ? "flex-row items-center gap-2" : "flex-col gap-1",
        wrapperClassName,
      )}
    >
      {label && (
        <AppLabel
          htmlFor={id}
          variant={labelVariant}
          required={required}
          optional={optional}
          className={cn(error && "text-destructive", labelClassName)}
        >
          {label}
        </AppLabel>
      )}

      {inputElement}

      {error && <p className="text-[0.75rem] font-medium text-destructive">{error}</p>}
      {!error && hint && <p className="text-[0.75rem] text-muted-foreground">{hint}</p>}
    </div>
  );
}
