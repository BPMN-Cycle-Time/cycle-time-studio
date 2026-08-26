"use client";

import * as React from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "./select";
import { AppLabel } from "./app-label";
import { cn } from "@/utils";

export interface SelectOption<T extends string = string> {
  value: T;
  label: React.ReactNode;
  disabled?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface AppSelectProps<T extends string = string> {
  value?: T;
  defaultValue?: T;
  onValueChange?: (value: T) => void;
  options: readonly SelectOption<T>[] | SelectOption<T>[];
  placeholder?: string;
  size?: "sm" | "default";
  disabled?: boolean;
  label?: React.ReactNode;
  labelVariant?: "default" | "field" | "caption" | "uppercase";
  required?: boolean;
  optional?: boolean;
  error?: string;
  hint?: React.ReactNode;
  wrapperClassName?: string;
  labelClassName?: string;
  triggerClassName?: string;
  contentClassName?: string;
  itemClassName?: string;
  id?: string;
  name?: string;
  "aria-label"?: string;
}

export function AppSelect<T extends string = string>({
  value,
  defaultValue,
  onValueChange,
  options,
  placeholder,
  size = "default",
  disabled,
  label,
  labelVariant = "field",
  required,
  optional,
  error,
  hint,
  wrapperClassName,
  labelClassName,
  triggerClassName,
  contentClassName,
  itemClassName,
  id,
  name,
  "aria-label": ariaLabel,
}: AppSelectProps<T>) {
  const selectElement = (
    <Select
      value={value}
      defaultValue={defaultValue}
      onValueChange={(val) => onValueChange?.(val as T)}
      disabled={disabled}
      name={name}
    >
      <SelectTrigger
        id={id}
        size={size}
        className={cn("text-xs font-medium shrink-0", triggerClassName)}
        aria-label={ariaLabel}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className={contentClassName}>
        {options.map((opt) => {
          const Icon = opt.icon;
          return (
            <SelectItem
              key={opt.value}
              value={opt.value}
              disabled={opt.disabled}
              className={cn("text-xs", itemClassName)}
            >
              <div className="flex items-center gap-2">
                {Icon && <Icon className="size-3.5 shrink-0 text-muted-foreground" />}
                <span>{opt.label}</span>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );

  if (!label && !error && !hint) {
    return selectElement;
  }

  return (
    <div className={cn("w-full flex flex-col gap-1", wrapperClassName)}>
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

      {selectElement}

      {error && <p className="text-[0.75rem] font-medium text-destructive">{error}</p>}
      {!error && hint && <p className="text-[0.75rem] text-muted-foreground">{hint}</p>}
    </div>
  );
}
