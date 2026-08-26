"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { PanelRightClose } from "lucide-react";

import { Project, FlowResult } from "@/types";
import { Button, AppTooltip, Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui";
import { cn } from "@/utils";
import { ParametersTab } from "./project-parameters-drawer/parameters-tab";
import { GraphDataTab } from "./project-parameters-drawer/graph-data-tab";

const MIN_WIDTH = 320;
const MAX_WIDTH = 768;
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

  return (
    <aside
      style={{
        width: collapsed ? "0px" : `${width}px`,
        minWidth: collapsed ? "0px" : undefined,
      }}
      className={cn(
        "h-svh border-l bg-background shadow-2xl flex flex-col relative transition-all duration-300 ease-in-out overflow-hidden z-10 shrink-0",
        collapsed && "border-l-0 shadow-none pointer-events-none",
        isResizing && "select-none transition-none",
      )}
    >
      {/* Drag handle to resize panel width */}
      {!collapsed && (
        <div
          onMouseDown={startResizing}
          className={cn(
            "absolute top-0 bottom-0 left-0 w-1.5 cursor-col-resize hover:bg-primary/40 active:bg-primary/80 z-50 transition-colors group flex items-center justify-center",
            isResizing && "bg-primary/80",
          )}
          title="Drag to resize panel width"
        >
          <div className="w-0.5 h-8 rounded-full bg-muted-foreground/40 group-hover:bg-primary-foreground/60 group-active:bg-primary-foreground/80 transition-colors" />
        </div>
      )}

      <div className="px-5 pt-5 pb-3 border-b flex flex-row items-center justify-between space-y-0 shrink-0">
        <h2 className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
          {tEd("parameters")}
        </h2>
        <AppTooltip content={tEd("collapsePanel")}>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => onCollapsedChange(true)}
          >
            <PanelRightClose className="size-4" />
          </Button>
        </AppTooltip>
      </div>

      <div className="px-5 py-6 flex flex-col gap-6 flex-1 overflow-y-auto">
        <Tabs defaultValue="params" className="w-full flex flex-col gap-6">
          <TabsList className="shrink-0 self-start">
            <TabsTrigger value="params" className="cursor-pointer">
              {tEd("parametersTab")}
            </TabsTrigger>
            <TabsTrigger value="graph" className="cursor-pointer">
              {tEd("graphDataTab")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="params" className="outline-none p-0 mt-2">
            <ParametersTab project={project} flow={flow} />
          </TabsContent>

          <TabsContent value="graph" className="outline-none p-0 mt-2">
            <GraphDataTab project={project} />
          </TabsContent>
        </Tabs>
      </div>
    </aside>
  );
}
