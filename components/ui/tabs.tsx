"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/utils";

interface TabsValueContextValue {
  value: string;
}

const TabsValueContext = React.createContext<TabsValueContextValue | null>(null);

function useTabsValue() {
  const ctx = React.useContext(TabsValueContext);
  return ctx?.value ?? "";
}

function Tabs({
  value: valueProp,
  onValueChange,
  defaultValue,
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  const [internalValue, setInternalValue] = React.useState(defaultValue ?? "");
  const value = valueProp ?? internalValue;

  return (
    <TabsValueContext.Provider value={{ value }}>
      <TabsPrimitive.Root
        data-slot="tabs"
        className={cn("flex flex-col gap-2", className)}
        value={value}
        defaultValue={valueProp === undefined ? defaultValue : undefined}
        onValueChange={(next) => {
          setInternalValue(next);
          onValueChange?.(next);
        }}
        {...props}
      />
    </TabsValueContext.Provider>
  );
}

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  const listRef = React.useRef<HTMLDivElement>(null);
  const value = useTabsValue();
  const [indicator, setIndicator] = React.useState({ left: 0, width: 0, opacity: 0 });

  const updateIndicator = React.useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const active = list.querySelector('[data-state="active"]') as HTMLElement | null;
    if (!active) {
      setIndicator((prev) => ({ ...prev, opacity: 0 }));
      return;
    }
    const listRect = list.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    const listStyles = window.getComputedStyle(list);
    const borderLeft = parseFloat(listStyles.borderLeftWidth);
    setIndicator({
      left: activeRect.left - listRect.left - borderLeft,
      width: activeRect.width,
      opacity: 1,
    });
  }, []);

  React.useLayoutEffect(() => {
    updateIndicator();
  }, [value, updateIndicator]);

  React.useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const observer = new ResizeObserver(updateIndicator);
    observer.observe(list);
    return () => observer.disconnect();
  }, [updateIndicator]);

  return (
    <TabsPrimitive.List
      ref={listRef}
      data-slot="tabs-list"
      className={cn(
        "relative bg-muted/70 text-muted-foreground inline-flex h-9.5 w-fit items-center justify-center rounded-xl p-1 cursor-pointer border border-border/40",
        className,
      )}
      {...props}
    >
      {props.children}
      <span
        className="pointer-events-none absolute left-0 top-1 bottom-1 rounded-lg bg-card transition-[transform,width] duration-250 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform z-0"
        style={{
          transform: `translateX(${indicator.left}px)`,
          width: indicator.width,
          opacity: indicator.opacity,
        }}
        aria-hidden="true"
      />
    </TabsPrimitive.List>
  );
}

function TabsTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative z-10 inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-lg border border-transparent px-3 py-1 text-xs font-semibold whitespace-nowrap text-muted-foreground transition-colors duration-150 hover:text-foreground data-[state=active]:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      {children}
    </TabsPrimitive.Trigger>
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none animate-in fade-in zoom-in-95 duration-200", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
