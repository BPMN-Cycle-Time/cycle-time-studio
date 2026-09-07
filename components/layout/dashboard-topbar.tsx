"use client";

import { useState, useRef, useEffect } from "react";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";

import { ThemeToggle } from "./theme-toggle";
import { LocaleSwitcher } from "./locale-switcher";
import { AppInput } from "@/components/ui";

interface DashboardTopbarProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export function DashboardTopbar({ searchQuery = "", onSearchChange }: DashboardTopbarProps) {
  const t = useTranslations("Home");
  const [internalQuery, setInternalQuery] = useState(searchQuery);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleQueryChange = (val: string) => {
    setInternalQuery(val);
    onSearchChange?.(val);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <header className="flex items-center justify-between gap-3 py-2 px-2.5 shrink-0 rounded-2xl bg-card border border-border/70 shadow-xs mt-3 mx-3 z-10">
      {/* Donezo-style Pill Search Bar */}
      <div className="flex-1 max-w-md">
        <AppInput
          ref={inputRef}
          value={internalQuery}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder={t("searchPlaceholder")}
          prefix={<Search className="size-3.5 text-muted-foreground" />}
          suffix={
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-muted text-[10px] font-mono font-medium text-muted-foreground border border-border/60">
              ⌘F
            </kbd>
          }
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              inputRef.current?.blur();
            }
          }}
        />
      </div>

      {/* Right Utility Actions: Language, Theme */}
      <div className="flex items-center gap-2 shrink-0">
        <LocaleSwitcher />
        <ThemeToggle />
      </div>
    </header>
  );
}
