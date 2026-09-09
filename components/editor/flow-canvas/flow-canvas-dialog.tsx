"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  useReactFlow,
  BackgroundVariant,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { X, Workflow, Sparkles, Maximize2, Timer, DollarSign } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  Button,
  Badge,
} from "@/components/ui";
import { BlockType, type Block } from "@/types";
import { useEditorStore, SelectionKind } from "@/store/useEditorStore";
import { computeFlow } from "@/services/engine";
import { useTranslations } from "next-intl";
import { AddBlockDropdown } from "../add-block-dropdown";
import { FlowCanvasNode } from "./flow-canvas-node";
import { FlowCanvasBranchNode } from "./flow-canvas-branch-node";
import { FlowCanvasEdge } from "./flow-canvas-edge";
import { buildFlowElements } from "./flow-canvas-layout";

interface FlowCanvasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const nodeTypes = {
  flowBlock: FlowCanvasNode,
  flowBranch: FlowCanvasBranchNode,
};

const edgeTypes = {
  flowEdge: FlowCanvasEdge,
};

function FlowCanvasInner({ onClose }: { onClose: () => void }) {
  const tEd = useTranslations("editor");
  const { fitView } = useReactFlow();

  const project = useEditorStore((s) => s.project);
  const selectedId = useEditorStore((s) => s.selectedId);
  const select = useEditorStore((s) => s.select);
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const removeBlock = useEditorStore((s) => s.removeBlock);
  const addBlock = useEditorStore((s) => s.addBlock);
  const updateBranch = useEditorStore((s) => s.updateBranch);
  const removeBranch = useEditorStore((s) => s.removeBranch);

  const blocks = useMemo(() => project?.blocks ?? [], [project?.blocks]);
  const tasks = useMemo(() => project?.tasks ?? [], [project?.tasks]);
  const unit = project?.unit ?? "min";
  const currency = project?.currency ?? "";

  // Compute total process summary
  const summary = useMemo(() => computeFlow(blocks, tasks), [blocks, tasks]);

  // Position cache so user drag positions persist during the session
  const [userPositions, setUserPositions] = useState<Record<string, { x: number; y: number }>>({});

  // Handle duplicate block
  const handleDuplicateBlock = useCallback(
    (b: Block) => {
      addBlock(b.type as BlockType);
    },
    [addBlock],
  );

  const tCommon = useTranslations("common");

  const labels = useMemo(
    () => ({
      subProcess: tEd("subProcess"),
      loopBody: tEd("loopBody"),
      branch: tEd("branchNamePlaceholder"),
      repeat: (p: number) => tEd("repeatLabel", { p }),
    }),
    [tEd],
  );

  // Build complete graph elements (recursive traversal of blocks, branches, and subBlocks)
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    return buildFlowElements({
      blocks,
      tasks,
      unit,
      currency,
      selectedId,
      userPositions,
      labels,
      onUpdateBlock: updateBlock,
      onRemoveBlock: removeBlock,
      onDuplicateBlock: handleDuplicateBlock,
      onUpdateBranch: updateBranch,
      onRemoveBranch: removeBranch,
      onSelect: (id: string) => select(SelectionKind.BLOCK, id),
    });
  }, [
    blocks,
    tasks,
    unit,
    currency,
    selectedId,
    userPositions,
    labels,
    updateBlock,
    removeBlock,
    handleDuplicateBlock,
    updateBranch,
    removeBranch,
    select,
  ]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Synchronize when store blocks or selection change
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  // Initial fit view on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      fitView({ padding: 0.25, duration: 350 });
    }, 120);
    return () => clearTimeout(timer);
  }, [fitView]);

  // Track position changes when user drags nodes
  const handleNodeDragStop = useCallback((_: unknown, node: Node) => {
    setUserPositions((prev) => ({
      ...prev,
      [node.id]: { x: node.position.x, y: node.position.y },
    }));
  }, []);

  // Auto-layout reset
  const handleAutoLayout = useCallback(() => {
    setUserPositions({});
    setTimeout(() => {
      fitView({ padding: 0.25, duration: 400 });
    }, 50);
  }, [fitView]);

  return (
    <div className="relative w-full h-full flex flex-col bg-background overflow-hidden select-none">
      {/* Top Floating Studio Header */}
      <header className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between gap-3 p-2.5 px-4 rounded-2xl bg-card/90 backdrop-blur-xl border border-border/80 shadow-lg">
        {/* Left: Branding & Steps Info */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0">
            <Workflow className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xs font-bold text-foreground tracking-wide">
                {tEd("visualCanvasTitle")}
              </h1>
              <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">
                {nodes.length} {tEd("stepsCount")}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground truncate max-w-[280px]">
              {project?.name || tEd("defaultProcessFlow")}
            </p>
          </div>
        </div>

        {/* Center Toolbar: Auto Layout, Fit View, Add Step */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAutoLayout}
            className="h-8 text-xs gap-1.5 font-medium shadow-2xs"
            title={tEd("autoLayout")}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-500" />
            <span className="hidden sm:inline">{tEd("autoLayout")}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fitView({ padding: 0.25, duration: 300 })}
            className="h-8 text-xs gap-1.5 font-medium shadow-2xs"
            title={tEd("fitView")}
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{tEd("fitView")}</span>
          </Button>

          <AddBlockDropdown onAddBlock={addBlock} buttonVariant="default" align="center" />
        </div>

        {/* Right: Summary KPIs & Close Button */}
        <div className="flex items-center gap-2.5">
          {/* KPI Pills */}
          <div className="hidden md:flex items-center gap-2 p-1 px-2.5 rounded-xl bg-muted/40 border border-border/60 text-xs font-mono">
            <span className="flex items-center gap-1 text-foreground font-semibold">
              <Timer className="w-3.5 h-3.5 text-emerald-500" />
              {Math.round(summary.total * 100) / 100} {unit}
            </span>
            {summary.totalCost > 0 && (
              <>
                <span className="text-muted-foreground/40">•</span>
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <DollarSign className="w-3.5 h-3.5" />
                  {Math.round(summary.totalCost * 100) / 100} {currency}
                </span>
              </>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground"
            aria-label={tCommon("buttons.cancel")}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Main ReactFlow Canvas */}
      <div className="flex-1 w-full h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeDragStop={handleNodeDragStop}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          minZoom={0.2}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          className="bg-dot-canvas"
        >
          {/* Dot Grid Background */}
          <Background
            variant={BackgroundVariant.Dots}
            gap={22}
            size={1.5}
            color="var(--diagram-dot, rgba(0,0,0,0.18))"
          />

          {/* Canvas Viewport Controls */}
          <Controls
            showInteractive={false}
            className="bottom-4! left-4! bg-card! border! border-border/80! shadow-lg! rounded-lg! overflow-hidden!"
          />
        </ReactFlow>
      </div>
    </div>
  );
}

export function FlowCanvasDialog({ open, onOpenChange }: FlowCanvasDialogProps) {
  const tEd = useTranslations("editor");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-[calc(100vw-80px)] h-[calc(100vh-80px)] max-w-none! sm:max-w-none! p-0 gap-0 rounded-3xl border border-border/80 shadow-2xl overflow-hidden flex flex-col"
      >
        <DialogTitle className="sr-only">{tEd("visualCanvasTitle")}</DialogTitle>
        <DialogDescription className="sr-only">{tEd("visualCanvasDesc")}</DialogDescription>
        <ReactFlowProvider>
          <FlowCanvasInner onClose={() => onOpenChange(false)} />
        </ReactFlowProvider>
      </DialogContent>
    </Dialog>
  );
}
