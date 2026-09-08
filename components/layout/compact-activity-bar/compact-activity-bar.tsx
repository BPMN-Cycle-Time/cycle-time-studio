"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Workflow,
  GitBranch,
  FileCode2,
  ScrollText,
  Network,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

import { AppTooltip, Input } from "@/components/ui";
import { useLocalStorageState } from "@/hooks";
import { STORAGE_KEYS } from "@/constants";
import { useEditorStore } from "@/store/useEditorStore";
import { cn } from "@/utils";

export type DiagramTab = "model" | "graph" | "bpmn" | "eventLog" | "socialNetwork";

interface CompactActivityBarProps {
  activeTab: DiagramTab;
  onTabChange: (tab: DiagramTab) => void;
}

interface NavItem {
  value: DiagramTab;
  labelKey: "processModelTab" | "graphTab" | "bpmnTab" | "eventLogTab" | "socialNetworkTab";
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { value: "model", labelKey: "processModelTab", icon: Workflow },
  { value: "graph", labelKey: "graphTab", icon: GitBranch },
  { value: "bpmn", labelKey: "bpmnTab", icon: FileCode2 },
  { value: "eventLog", labelKey: "eventLogTab", icon: ScrollText },
  { value: "socialNetwork", labelKey: "socialNetworkTab", icon: Network },
];

export function CompactActivityBar({ activeTab, onTabChange }: CompactActivityBarProps) {
  const t = useTranslations("diagram");
  const tSidebar = useTranslations("Sidebar");
  const { project, setName } = useEditorStore();
  const [collapsed, setCollapsed] = useLocalStorageState(
    STORAGE_KEYS.ACTIVITY_BAR_COLLAPSED,
    false,
  );

  return (
    <aside
      className={cn(
        "shrink-0 rounded-2xl border border-border/70 bg-card shadow-xs flex flex-col py-3 my-3 ml-3 h-[calc(100svh-1.5rem)] sticky top-3 z-20 transition-all duration-300 ease-in-out overflow-hidden",
        collapsed ? "w-16 items-center" : "w-56 items-stretch",
      )}
    >
      {/* Top: Project Name & Collapse button */}
      <div
        className={cn(
          "flex items-center mb-3",
          collapsed ? "justify-center px-1" : "justify-between px-2.5 gap-1.5",
        )}
      >
        {!collapsed && (
          <Input
            value={project?.name ?? ""}
            onChange={(e) => setName(e.target.value)}
            placeholder={tSidebar("projectName")}
            className="h-8 font-bold text-sm tracking-tight text-foreground border-transparent hover:border-input focus-visible:border-primary shadow-none px-2 min-w-0 flex-1 transition-colors rounded-lg"
            title={project?.name}
          />
        )}
        <AppTooltip
          content={collapsed ? t("activityBarExpandTooltip") : t("activityBarCollapseTooltip")}
          side="right"
        >
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="shrink-0 size-8 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            aria-label={collapsed ? t("activityBarExpandTooltip") : t("activityBarCollapseTooltip")}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
          </button>
        </AppTooltip>
      </div>

      {/* Diagram view nav items */}
      <div className={cn("flex flex-col gap-0.5 flex-1", collapsed ? "items-center px-1" : "px-2")}>
        {NAV_ITEMS.map(({ value, labelKey, icon: Icon }) => {
          const isActive = activeTab === value;
          const label = t(labelKey);

          const btn = (
            <button
              key={value}
              type="button"
              onClick={() => onTabChange(value)}
              className={cn(
                "relative flex items-center gap-2.5 rounded-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                collapsed ? "size-9 justify-center" : "w-full h-9 px-2.5 justify-start",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
              )}
              aria-label={label}
              aria-pressed={isActive}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-primary" />
              )}
              <Icon className="size-4 shrink-0" />
              {!collapsed && <span className="text-xs font-medium truncate">{label}</span>}
            </button>
          );

          if (collapsed) {
            return (
              <AppTooltip key={value} content={label} side="right">
                {btn}
              </AppTooltip>
            );
          }
          return btn;
        })}
      </div>

      {/* Divider */}
      <div className={cn("h-px bg-border/60 my-2", collapsed ? "w-8 mx-auto" : "mx-2")} />

      {/* Home link */}
      <div className={cn(collapsed ? "flex justify-center px-1" : "px-2")}>
        {collapsed ? (
          <AppTooltip content={t("activityBarHomeTooltip")} side="right">
            <Link
              href="/"
              className="size-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              aria-label={t("activityBarHomeTooltip")}
            >
              <LayoutDashboard className="size-4" />
            </Link>
          </AppTooltip>
        ) : (
          <Link
            href="/"
            className="flex items-center gap-2.5 h-9 px-2.5 w-full rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            aria-label={t("activityBarHomeTooltip")}
          >
            <LayoutDashboard className="size-4 shrink-0" />
            <span className="text-xs font-medium truncate">{t("activityBarHomeTooltip")}</span>
          </Link>
        )}
      </div>
    </aside>
  );
}
