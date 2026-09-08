"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { BarChart3, Table2 } from "lucide-react";
import type { Block, Task, SocialMetricType, EventLogItem } from "@/types";
import { generateEventLog } from "@/services/event-log";
import { buildSocialNetwork } from "@/services/social-network";
import { exportSvgToPng, slugify } from "@/utils";
import { useEditorStore } from "@/store/useEditorStore";
import { Card, CardContent, Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui";
import { DiagramViewport } from "../diagram-viewport";
import { SocialNetworkHeader } from "./social-network-header";
import { SocialNetworkEdges } from "./social-network-edges";
import { SocialMatrixTable } from "./social-matrix-table";
import { SocialEvaluationTable } from "./social-evaluation-table";
import { SocialNodeInspector } from "./social-node-inspector";
import { SocialMetricsGuide } from "./social-metrics-guide";

interface SocialNetworkPanelProps {
  blocks: Block[];
  tasks?: Task[];
  unit: string;
  uploadedEvents?: EventLogItem[] | null;
  onUploadEvents?: (events: EventLogItem[] | null) => void;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 560;

export function SocialNetworkPanel({
  blocks,
  tasks,
  unit,
  uploadedEvents,
  onUploadEvents,
}: SocialNetworkPanelProps) {
  const tDiag = useTranslations("diagram");

  const [metric, setMetric] = useState<SocialMetricType>("handover");
  const [minThreshold, setMinThreshold] = useState<number>(1);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [seed, setSeed] = useState<number>(1);
  const [isExporting, setIsExporting] = useState(false);

  const svgRef = useRef<SVGSVGElement>(null);
  const projectName = useEditorStore((s) => s.project?.name);

  // Generate synthetic event log for network analysis (50 cases for robust statistics)
  const simulatedEvents = useMemo(() => {
    if (!blocks || blocks.length === 0) return [];
    void seed;
    return generateEventLog(blocks, tasks, unit, { caseCount: 50 });
  }, [blocks, tasks, unit, seed]);

  const events = uploadedEvents ?? simulatedEvents;
  const isUploaded = Boolean(uploadedEvents && uploadedEvents.length > 0);

  // Construct baseline network graph (unfiltered to derive dynamic thresholds & edge counts)
  const baseNetwork = useMemo(() => {
    return buildSocialNetwork(events, metric, 1);
  }, [events, metric]);

  const availableThresholds = baseNetwork.availableThresholds;
  const thresholdEdgeCounts = baseNetwork.thresholdEdgeCounts || {};
  const activeThreshold = availableThresholds.includes(minThreshold) ? minThreshold : 1;

  // Construct filtered network graph based on active threshold
  const networkData = useMemo(() => {
    if (activeThreshold === 1) return baseNetwork;
    return buildSocialNetwork(events, metric, activeThreshold);
  }, [events, metric, activeThreshold, baseNetwork]);

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

  const handleExportPng = useCallback(async () => {
    if (!svgRef.current) return;
    setIsExporting(true);
    try {
      const metricName = metric === "handover" ? "handover" : "working-together";
      const fileName = `${slugify(projectName || "project")}-social-network-${metricName}.png`;
      await exportSvgToPng(svgRef.current, fileName);
    } finally {
      setIsExporting(false);
    }
  }, [metric, projectName]);

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
    <div className="flex flex-col gap-3.5 w-full h-full pb-6">
      {/* Header & Controls */}
      <div className="flex flex-col gap-3 w-full bg-card border border-border/70 p-3.5 rounded-2xl shadow-xs">
        <SocialNetworkHeader
          isUploaded={isUploaded}
          metric={metric}
          onMetricChange={setMetric}
          availableThresholds={availableThresholds}
          thresholdEdgeCounts={thresholdEdgeCounts}
          activeThreshold={activeThreshold}
          onThresholdChange={setMinThreshold}
          onUploadEvents={onUploadEvents}
          onRegenerate={handleRegenerate}
          totalNodes={networkData.nodes.length}
          totalEdges={networkData.edges.length}
          onExportPng={handleExportPng}
          isExporting={isExporting}
        />
      </div>

      {/* Main Content Layout: Full Width Canvas on top, stacked details below */}
      <div className="flex flex-col gap-4 w-full">
        {/* Top: Diagram Canvas (Full Width) */}
        <Card className="w-full p-4 flex flex-col h-[560px] overflow-hidden relative shadow-xs border-border/80">
          <DiagramViewport
            contentWidth={CANVAS_WIDTH}
            contentHeight={CANVAS_HEIGHT}
            className="w-full h-full flex-1"
          >
            <svg
              ref={svgRef}
              viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              role="img"
              aria-label="Social Network Diagram"
              className="select-none overflow-visible"
              onClick={() => setSelectedNodeId(null)}
            >
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

              {/* Render Edges (memoized subcomponent) */}
              <SocialNetworkEdges
                edges={networkData.edges}
                nodeMap={nodeMap}
                metric={metric}
                selectedNodeId={selectedNodeId}
                maxEdgeWeight={networkData.maxEdgeWeight}
              />

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
                const y = node.y ?? 260;

                // Radial label placement: position labels outward from diagram center to prevent obscuring edge flow
                const angleFromCenter = Math.atan2(y - 260, x - 400);
                const labelOffsetX = Math.round(Math.cos(angleFromCenter) * 44);
                const labelOffsetY = Math.round(Math.sin(angleFromCenter) * 38);

                return (
                  <g
                    key={node.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`${node.label}, ${node.activityCount} activities`}
                    aria-pressed={isSelected}
                    transform={`translate(${x}, ${y})`}
                    className="group/node cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNodeId(isSelected ? null : node.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedNodeId(isSelected ? null : node.id);
                      }
                    }}
                  >
                    {/* Transparent buffer circle to stabilize hit-testing at the boundary */}
                    <circle cx="0" cy="0" r="28" fill="transparent" pointerEvents="all" />

                    {/* Selection halo */}
                    {isSelected && (
                      <circle
                        cx="0"
                        cy="0"
                        r="32"
                        fill="none"
                        stroke="var(--primary)"
                        strokeWidth="2.5"
                        strokeDasharray="4 2"
                        className="animate-spin-slow pointer-events-none"
                      />
                    )}

                    {/* Subtle hover ring (fades in smoothly without any scale/jump jitter) */}
                    {!isSelected && (
                      <circle
                        cx="0"
                        cy="0"
                        r="28"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="text-primary/0 group-hover/node:text-primary/40 transition-colors duration-200 pointer-events-none"
                      />
                    )}

                    {/* Main Node Circle with smooth brightness and shadow on hover */}
                    <circle
                      cx="0"
                      cy="0"
                      r="24"
                      fill={node.color || "#3b82f6"}
                      className="shadow-md transition-all duration-200 group-hover/node:brightness-110 group-hover/node:drop-shadow-md"
                    />

                    {/* Initials */}
                    <text
                      x="0"
                      y="4.5"
                      textAnchor="middle"
                      className="text-xs font-bold fill-white pointer-events-none select-none"
                    >
                      {initials}
                    </text>

                    {/* Node Label Card positioned radially outward */}
                    <g transform={`translate(${labelOffsetX}, ${labelOffsetY})`}>
                      <rect
                        x="-52"
                        y="-11"
                        width="104"
                        height="22"
                        rx="6"
                        className="fill-card/95 stroke-border/80 group-hover/node:stroke-primary/60 group-hover/node:shadow-sm transition-all duration-200"
                        strokeWidth="1"
                      />
                      <text
                        x="0"
                        y="4"
                        textAnchor="middle"
                        className="text-[11px] font-semibold fill-foreground group-hover/node:fill-primary pointer-events-none select-none transition-colors duration-200"
                      >
                        {node.label.length > 14 ? `${node.label.slice(0, 13)}…` : node.label}
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>
          </DiagramViewport>
        </Card>

        {/* Bottom Details: Full-width stacked layout */}
        <div className="flex flex-col gap-4 w-full">
          {/* Node Inspector / Network Insights (Full width) */}
          <SocialNodeInspector
            selectedNode={selectedNode}
            onClearSelection={() => setSelectedNodeId(null)}
            mostActiveNode={mostActiveNode}
            topEdge={topEdge}
            totalNodes={networkData.nodes.length}
          />

          {/* Sub-Tabs for Evaluation & Matrix Table (Full width) */}
          <Card className="w-full">
            <CardContent className="px-4">
              <Tabs defaultValue="evaluation" className="w-full flex flex-col">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <TabsList className="h-8 bg-muted/60 p-0.5 rounded-lg border border-border/60">
                    <TabsTrigger
                      value="evaluation"
                      className="text-xs px-3 h-7 flex items-center gap-1.5 rounded-md"
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      {tDiag("evaluationTab")}
                    </TabsTrigger>
                    <TabsTrigger
                      value="matrix"
                      className="text-xs px-3 h-7 flex items-center gap-1.5 rounded-md"
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
            </CardContent>
          </Card>

          {/* Metrics Guide */}
          <SocialMetricsGuide />
        </div>
      </div>
    </div>
  );
}
