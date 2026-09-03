"use client";

import { PanelRightClose } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";

import { AppTooltip, Button, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";
import { FlowResult, Project } from "@/types";
import { cn } from "@/utils";
import { GraphDataTab } from "./graph-data-tab";
import { ParametersTab } from "./parameters-tab";

const MIN_WIDTH = 320;
const MAX_WIDTH = 1024;
const DEFAULT_WIDTH = 480;

interface ProjectParametersDrawerProps {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  project: Project;
  flow: FlowResult | null;
}

export function ProjectParametersDrawer({
  collapsed,
  onCollapsedChange,
  project,
  flow,
}: ProjectParametersDrawerProps) {
  const tEd = useTranslations("editor");

  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = useCallback(
    (mouseDownEvent: React.MouseEvent) => {
      mouseDownEvent.preventDefault();
      setIsResizing(true);

      const startX = mouseDownEvent.clientX;
      const startWidth = width;

      const onMouseMove = (mouseMoveEvent: MouseEvent) => {
        const deltaX = startX - mouseMoveEvent.clientX;
        const newWidth = Math.min(Math.max(startWidth + deltaX, MIN_WIDTH), MAX_WIDTH);
        setWidth(newWidth);
      };

      const onMouseUp = () => {
        setIsResizing(false);
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [width],
  );

  const tabs = [
    {
      value: "params",
      label: tEd("parametersTab"),
      content: <ParametersTab project={project} flow={flow} />,
    },
    {
      value: "graph",
      label: tEd("graphDataTab"),
      content: <GraphDataTab project={project} />,
    },
  ];

  return (
    <aside
      style={{
        width: collapsed ? "0px" : `${width}px`,
        minWidth: collapsed ? "0px" : undefined,
      }}
      className={cn(
        "rounded-xl border border-border/70 bg-card shadow-sm flex flex-col h-[calc(100svh-1.5rem)] my-3 mr-3 relative transition-all duration-300 ease-in-out overflow-hidden z-10 shrink-0",
        collapsed && "w-0 min-w-0 mr-0 border-0 shadow-none pointer-events-none",
        isResizing && "select-none transition-none",
      )}
    >
      {/* Drag handle to resize panel width */}
      {!collapsed && (
        <div
          onMouseDown={startResizing}
          className={cn(
            "absolute top-0 bottom-0 left-0 w-2 cursor-col-resize hover:bg-primary/30 active:bg-primary/70 z-50 transition-colors group flex items-center justify-center",
            isResizing && "bg-primary/70",
          )}
          title="Drag to resize panel width"
        >
          <div className="w-0.5 h-8 rounded-full bg-muted-foreground/30 group-hover:bg-foreground/60 transition-colors" />
        </div>
      )}

      <div className="px-4 pt-4 pb-3 border-b border-border/40 flex flex-row items-center justify-between space-y-0 shrink-0">
        <h2 className="text-xs font-bold text-foreground tracking-tight">{tEd("parameters")}</h2>
        <AppTooltip content={tEd("collapsePanel")}>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 rounded-lg"
            onClick={() => onCollapsedChange(true)}
          >
            <PanelRightClose className="size-3.5" />
          </Button>
        </AppTooltip>
      </div>

      <div className="p-4 flex flex-col gap-4 flex-1 overflow-y-auto">
        <Tabs defaultValue="params" className="w-full flex flex-col gap-5">
          <TabsList className="w-full bg-muted/70 dark:bg-muted/40 p-1 rounded-xl">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="rounded-lg text-xs">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {tabs.map((tab) => (
            <TabsContent key={tab.value} value={tab.value} className="outline-none p-0">
              {tab.content}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </aside>
  );
}
