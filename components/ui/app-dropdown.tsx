"use client";

import * as React from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "./dropdown-menu";
import { cn } from "@/utils";

export interface AppDropdownItem {
  id?: string;
  label?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  dot?: string;
  badge?: React.ReactNode;
  disabled?: boolean;
  destructive?: boolean;
  separator?: boolean;
  onClick?: () => void;
}

export interface AppDropdownProps {
  /** The trigger element that opens the dropdown */
  trigger: React.ReactNode;
  /** Optional title shown at the top of dropdown content */
  title?: React.ReactNode;
  /** List of dropdown items or separator definitions */
  items: AppDropdownItem[];
  /** Dropdown menu alignment relative to trigger (default: "start") */
  align?: "start" | "center" | "end";
  /** Dropdown menu side (default: "bottom") */
  side?: "top" | "bottom" | "left" | "right";
  /** Optional side offset (default: 4) */
  sideOffset?: number;
  /** Custom class name for dropdown content */
  contentClassName?: string;
  /** Controlled open state */
  open?: boolean;
  /** Controlled onOpenChange callback */
  onOpenChange?: (open: boolean) => void;
}

export function AppDropdown({
  trigger,
  title,
  items,
  align = "start",
  side = "bottom",
  sideOffset = 4,
  contentClassName,
  open,
  onOpenChange,
}: AppDropdownProps) {
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        side={side}
        sideOffset={sideOffset}
        className={cn("w-52", contentClassName)}
      >
        {title && (
          <>
            <DropdownMenuLabel className="text-xs font-semibold">{title}</DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        )}
        {items.map((item, idx) => {
          if (item.separator) {
            return <DropdownMenuSeparator key={item.id ?? `sep-${idx}`} />;
          }

          const Icon = item.icon;

          return (
            <DropdownMenuItem
              key={item.id ?? `item-${idx}`}
              onClick={item.onClick}
              disabled={item.disabled}
              className={cn(
                "gap-2.5 text-xs cursor-pointer",
                item.destructive &&
                  "text-destructive focus:text-destructive focus:bg-destructive/10",
              )}
            >
              {item.dot && <div className={cn("size-2 rounded-full shrink-0", item.dot)} />}
              {Icon && <Icon className="size-3.5 text-muted-foreground shrink-0" />}
              <span className="truncate flex-1">{item.label}</span>
              {item.badge && (
                <span className="text-[10px] font-mono text-muted-foreground ml-auto shrink-0">
                  {item.badge}
                </span>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
