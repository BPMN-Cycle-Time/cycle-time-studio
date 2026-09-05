"use client";

import { useState, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Share2, ArrowRightLeft, Users2, Filter, RefreshCw, BarChart3, Table2 } from "lucide-react";
import type { Block, Task, SocialMetricType } from "@/types";
import { generateEventLog } from "@/services/event-log";
import { buildSocialNetwork } from "@/services/social-network";
import { AppCard, Button, Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui";
import { DiagramViewport } from "../diagram-viewport";
import { SocialMatrixTable } from "./social-matrix-table";
import { SocialEvaluationTable } from "./social-evaluation-table";
import { SocialNodeInspector } from "./social-node-inspector";

interface SocialNetworkPanelProps {
  blocks: Block[];
  tasks?: Task[];
  unit: string;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 560;

export function SocialNetworkPanel({ blocks, tasks, unit }: SocialNetworkPanelProps) {
  const tDiag = useTranslations("diagram");

  const [metric, setMetric] = useState<SocialMetricType>("handover");
  const [minThreshold, setMinThreshold] = useState<number>(1);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [seed, setSeed] = useState<number>(1);

  // Generate synthetic event log for network analysis (50 cases for robust statistics)
  const events = useMemo(() => {
    if (!blocks || blocks.length === 0) return [];
    void seed;
    return generateEventLog(blocks, tasks, unit, { caseCount: 50 });
  }, [blocks, tasks, unit, seed]);

  // Construct network graph
  const networkData = useMemo(() => {
    return buildSocialNetwork(events, metric, minThreshold);
  }, [events, metric, minThreshold]);

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return networkData.nodes.find((n) => n.id === selectedNodeId) || null;
  }, [networkData.nodes, selectedNodeId]);

  const mostActiveNode = useMemo(() => {
    if (networkData.nodes.length === 0) return null;
    return [...networkData.nodes].sort((a, b) => b.activityCount - a.activityCount)[0] || null;
  }, [networkData.nodes]);

  const topEdge = useMemo(() => {
    if (networkData.edges.length === 0) return null;
    return [...networkData.edges].sort((a, b) => b.weight - a.weight)[0] || null;
  }, [networkData.edges]);

  const handleRegenerate = useCallback(() => {
    setSeed((s) => s + 1);
  }, []);

  // Node position map for fast edge lookup
  const nodeMap = useMemo(() => {
    const map = new Map<string, { x: number; y: number; label: string; color: string }>();
    for (const n of networkData.nodes) {
      map.set(n.id, {
        x: n.x ?? 400,
        y: n.y ?? 260,
        label: n.label,
        color: n.color ?? "#3b82f6",
      });
    }
    return map;
  }, [networkData.nodes]);

  return (
    <div className="flex flex-col gap-4 w-full h-full pb-6">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card border border-border/70 p-4 rounded-xl shadow-xs">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Share2 className="w-4 h-4 text-primary" />
            {tDiag("socialNetworkTitle")}
          </h2>
          <p className="text-xs text-muted-foreground">{tDiag("socialNetworkDesc")}</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Metric Selector Tabs */}
          <Tabs
            value={metric}
            onValueChange={(val) => setMetric(val as SocialMetricType)}
            className="shrink-0"
          >
            <TabsList className="h-8">
              <TabsTrigger value="handover" className="text-xs px-2.5 h-6">
                <ArrowRightLeft className="w-3 h-3 mr-1.5" />
                {tDiag("metricHandover")}
              </TabsTrigger>
              <TabsTrigger value="workingTogether" className="text-xs px-2.5 h-6">
                <Users2 className="w-3 h-3 mr-1.5" />
                {tDiag("metricWorkingTogether")}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Min Weight Filter */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground border border-border/70 rounded-md px-2 py-1 bg-background/50">
            <Filter className="w-3 h-3 text-muted-foreground" />
            <span>{tDiag("minThreshold")}:</span>
            {[1, 2, 3, 5].map((thresh) => (
              <Button
                key={thresh}
                variant={minThreshold === thresh ? "default" : "ghost"}
                size="sm"
                onClick={() => setMinThreshold(thresh)}
                className="h-6 px-2 py-0 text-xs font-mono"
              >
                {thresh}
              </Button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRegenerate}
            className="text-xs flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {tDiag("generateEventLog")}
          </Button>
        </div>
      </div>

      {/* Main Content Layout: Full Width Canvas on top, stacked details below */}
      <div className="flex flex-col gap-4 w-full">
        {/* Top: Diagram Canvas (Full Width) */}
        <AppCard className="w-full p-0 flex flex-col h-[560px] overflow-hidden relative shadow-xs">
          <DiagramViewport
            contentWidth={CANVAS_WIDTH}
            contentHeight={CANVAS_HEIGHT}
            className="w-full h-full"
          >
            <svg
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="select-none overflow-visible"
              onClick={() => setSelectedNodeId(null)}
            >
              <defs>
                <marker
                  id="social-arrow"
                  viewBox="0 0 10 10"
                  refX="18"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path
                    d="M 0 1 L 10 5 L 0 9 z"
                    fill="currentColor"
                    className="text-muted-foreground"
                  />
                </marker>
                <marker
                  id="social-arrow-active"
                  viewBox="0 0 10 10"
                  refX="18"
                  refY="5"
                  markerWidth="7"
                  markerHeight="7"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="currentColor" className="text-primary" />
                </marker>
              </defs>

              {/* Background circular guide */}
              <circle
                cx={400}
                cy={260}
                r={185}
                fill="none"
                stroke="currentColor"
                strokeDasharray="4 6"
                className="text-border/40"
              />

              {/* Render Edges */}
              {networkData.edges.map((edge) => {
                const s = nodeMap.get(edge.source);
                const t = nodeMap.get(edge.target);
                if (!s || !t) return null;

                const isConnected =
                  !selectedNodeId ||
                  edge.source === selectedNodeId ||
                  edge.target === selectedNodeId;

                const strokeWidth = Math.max(
                  1.5,
                  Math.min(6, 1.5 + (edge.weight / (networkData.maxEdgeWeight || 1)) * 4.5),
                );

                // Curved path calculation
                const dx = t.x - s.x;
                const dy = t.y - s.y;
                const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
                const nx = -dy / dist;
                const ny = dx / dist;

                const curvature = metric === "handover" ? 24 : 0;
                const mx = (s.x + t.x) / 2 + nx * curvature;
                const my = (s.y + t.y) / 2 + ny * curvature;

                const pathData =
                  curvature > 0
                    ? `M ${s.x} ${s.y} Q ${mx} ${my} ${t.x} ${t.y}`
                    : `M ${s.x} ${s.y} L ${t.x} ${t.y}`;

                return (
                  <g
                    key={edge.id}
                    className={`transition-opacity duration-200 ${
                      isConnected ? "opacity-100" : "opacity-15"
                    }`}
                  >
                    <path
                      d={pathData}
                      fill="none"
                      stroke={
                        selectedNodeId &&
                        (edge.source === selectedNodeId || edge.target === selectedNodeId)
                          ? "var(--primary)"
                          : "currentColor"
                      }
                      strokeWidth={strokeWidth}
                      markerEnd={
                        metric === "handover"
                          ? selectedNodeId &&
                            (edge.source === selectedNodeId || edge.target === selectedNodeId)
                            ? "url(#social-arrow-active)"
                            : "url(#social-arrow)"
                          : undefined
                      }
                      className={
                        selectedNodeId &&
                        (edge.source === selectedNodeId || edge.target === selectedNodeId)
                          ? "text-primary"
                          : "text-border hover:text-muted-foreground"
                      }
                    />
                    {/* Weight Badge */}
                    <g transform={`translate(${mx}, ${my})`}>
                      <rect
                        x="-12"
                        y="-8"
                        width="24"
                        height="16"
                        rx="8"
                        className="fill-card stroke-border/80"
                        strokeWidth="1"
                      />
                      <text
                        x="0"
                        y="3.5"
                        textAnchor="middle"
                        className="text-[10px] font-mono font-bold fill-foreground"
                      >
                        {edge.weight}
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* Render Nodes */}
              {networkData.nodes.map((node) => {
                const isSelected = selectedNodeId === node.id;
                const initials = node.label
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();

                const x = node.x ?? 400;
                const y = node.y ?? 300;

                return (
                  <g
                    key={node.id}
                    transform={`translate(${x}, ${y})`}
                    className="cursor-pointer transition-transform duration-200 hover:scale-105"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNodeId(isSelected ? null : node.id);
                    }}
                  >
                    {/* Selection halo */}
                    {isSelected && (
                      <circle
                        cx="0"
                        cy="0"
                        r="32"
                        fill="none"
                        stroke="var(--primary)"
                        strokeWidth="3"
                        strokeDasharray="4 2"
                        className="animate-spin-slow"
                      />
                    )}

                    {/* Main Node Circle */}
                    <circle
                      cx="0"
                      cy="0"
                      r="24"
                      fill={node.color || "#3b82f6"}
                      className="shadow-md"
                    />

                    {/* Initials */}
                    <text
                      x="0"
                      y="5"
                      textAnchor="middle"
                      className="text-xs font-bold fill-white pointer-events-none"
                    >
                      {initials}
                    </text>

                    {/* Node Label Card below */}
                    <g transform="translate(0, 36)">
                      <rect
                        x="-54"
                        y="-10"
                        width="108"
                        height="22"
                        rx="6"
                        className="fill-card/90 stroke-border shadow-xs"
                        strokeWidth="1"
                      />
                      <text
                        x="0"
                        y="5"
                        textAnchor="middle"
                        className="text-[11px] font-semibold fill-foreground pointer-events-none"
                      >
                        {node.label.length > 14 ? `${node.label.slice(0, 13)}…` : node.label}
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>
          </DiagramViewport>
        </AppCard>

        {/* Bottom Details: Node Inspector / Network Insights & Interaction Matrix Table */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 w-full items-start">
          {/* Left: Node Inspector & Insights Card */}
          <SocialNodeInspector
            selectedNode={selectedNode}
            onClearSelection={() => setSelectedNodeId(null)}
            mostActiveNode={mostActiveNode}
            topEdge={topEdge}
            totalNodes={networkData.nodes.length}
          />

          {/* Right: Sub-Tabs for Evaluation & Matrix Table */}
          <AppCard className="lg:col-span-8 p-4 flex flex-col shadow-xs border-border/70">
            <Tabs defaultValue="evaluation" className="w-full flex flex-col">
              <div className="flex items-center justify-between gap-2 mb-3 border-b border-border/50 pb-2.5">
                <TabsList className="h-8">
                  <TabsTrigger
                    value="evaluation"
                    className="text-xs px-3 h-6 flex items-center gap-1.5"
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    {tDiag("evaluationTab")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="matrix"
                    className="text-xs px-3 h-6 flex items-center gap-1.5"
                  >
                    <Table2 className="w-3.5 h-3.5" />
                    {tDiag("interactionTab")}
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="evaluation" className="mt-0 outline-none">
                <SocialEvaluationTable evaluations={networkData.evaluations} />
              </TabsContent>

              <TabsContent value="matrix" className="mt-0 outline-none">
                <SocialMatrixTable
                  edges={networkData.edges}
                  totalInteractions={networkData.totalInteractions}
                />
              </TabsContent>
            </Tabs>
          </AppCard>
        </div>
      </div>
    </div>
  );
}
