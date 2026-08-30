"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Download, FileSpreadsheet, FileText, Code, Copy, Check } from "lucide-react";
import type { ProcessGraph } from "@/types";
import { nodesToCsv, edgesToCsv, exportGraphToWorkbook } from "@/services/xlsx";
import { slugify } from "@/utils";
import { useEditorStore } from "@/store/useEditorStore";
import {
  Button,
  Badge,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui";

interface ExportGraphDialogProps {
  graph: ProcessGraph;
}

function triggerDownload(content: Uint8Array | string, filename: string, mimeType: string) {
  const blob =
    content instanceof Uint8Array
      ? new Blob([content as unknown as BlobPart], { type: mimeType })
      : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ExportGraphDialog({ graph }: ExportGraphDialogProps) {
  const t = useTranslations("diagram");
  const [open, setOpen] = useState(false);
  const [copiedType, setCopiedType] = useState<"nodes" | "edges" | null>(null);
  const projectName = useEditorStore((s) => s.project?.name);

  const baseFileName = slugify(projectName || "process-graph");

  const handleExportXlsx = () => {
    const buffer = exportGraphToWorkbook(graph);
    triggerDownload(
      buffer,
      `${baseFileName}-nodes-edges.xlsx`,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
  };

  const handleExportNodesCsv = () => {
    const csv = nodesToCsv(graph.nodes);
    triggerDownload(csv, `${baseFileName}-nodes.csv`, "text/csv;charset=utf-8;");
  };

  const handleExportEdgesCsv = () => {
    const csv = edgesToCsv(graph.edges);
    triggerDownload(csv, `${baseFileName}-edges.csv`, "text/csv;charset=utf-8;");
  };

  const handleExportJson = () => {
    const jsonStr = JSON.stringify(
      {
        nodes: graph.nodes.map((n) => ({
          id: n.id,
          name: n.name,
          type: n.type,
          time: n.time || "",
          shape: n.shape,
        })),
        edges: graph.edges.map((e) => ({
          source: e.s,
          target: e.t,
          label: e.label || "",
          back: e.back,
        })),
      },
      null,
      2,
    );
    triggerDownload(jsonStr, `${baseFileName}-graph.json`, "application/json");
  };

  const handleCopyNodesCsv = async () => {
    const csv = nodesToCsv(graph.nodes);
    await navigator.clipboard.writeText(csv);
    setCopiedType("nodes");
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleCopyEdgesCsv = async () => {
    const csv = edgesToCsv(graph.edges);
    await navigator.clipboard.writeText(csv);
    setCopiedType("edges");
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs font-medium">
          <Download className="size-3.5 mr-1.5" />
          {t("exportGraph")}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="shrink-0 space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <FileSpreadsheet className="size-4.5 text-primary" />
              {t("exportGraphTitle")}
            </DialogTitle>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-xs">
                {graph.nodes.length} nodes
              </Badge>
              <Badge variant="outline" className="text-xs">
                {graph.edges.length} edges
              </Badge>
            </div>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            {t("exportGraphDescription")}
          </DialogDescription>
        </DialogHeader>

        {/* Action Export Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-2 shrink-0">
          <Button
            variant="default"
            size="sm"
            onClick={handleExportXlsx}
            className="h-9 text-xs font-medium flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <FileSpreadsheet className="size-3.5" />
            {t("exportXlsx")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportNodesCsv}
            className="h-9 text-xs font-medium flex items-center justify-center gap-1.5"
          >
            <FileText className="size-3.5" />
            {t("exportNodesCsv")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportEdgesCsv}
            className="h-9 text-xs font-medium flex items-center justify-center gap-1.5"
          >
            <FileText className="size-3.5" />
            {t("exportEdgesCsv")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportJson}
            className="h-9 text-xs font-medium flex items-center justify-center gap-1.5"
          >
            <Code className="size-3.5" />
            {t("exportJson")}
          </Button>
        </div>

        {/* Data Preview Tabs */}
        <Tabs defaultValue="nodes" className="flex-1 flex flex-col min-h-0 mt-2">
          <div className="flex items-center justify-between gap-3 shrink-0 mb-2">
            <TabsList className="h-8">
              <TabsTrigger value="nodes" className="text-xs px-3">
                {t("nodesTab", { count: graph.nodes.length })}
              </TabsTrigger>
              <TabsTrigger value="edges" className="text-xs px-3">
                {t("edgesTab", { count: graph.edges.length })}
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyNodesCsv}
                className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
              >
                {copiedType === "nodes" ? (
                  <Check className="size-3.5 mr-1 text-emerald-600" />
                ) : (
                  <Copy className="size-3.5 mr-1" />
                )}
                {t("copyNodesCsv")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyEdgesCsv}
                className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
              >
                {copiedType === "edges" ? (
                  <Check className="size-3.5 mr-1 text-emerald-600" />
                ) : (
                  <Copy className="size-3.5 mr-1" />
                )}
                {t("copyEdgesCsv")}
              </Button>
            </div>
          </div>

          <TabsContent value="nodes" className="flex-1 overflow-auto border rounded-md min-h-0 m-0">
            <table className="w-full text-left text-xs border-collapse font-sans">
              <thead className="bg-muted/60 sticky top-0 border-b z-10">
                <tr>
                  <th className="py-2 px-3 font-semibold w-16">{t("colId")}</th>
                  <th className="py-2 px-3 font-semibold">{t("colName")}</th>
                  <th className="py-2 px-3 font-semibold w-24">{t("colType")}</th>
                  <th className="py-2 px-3 font-semibold w-24 text-right">{t("colTime")}</th>
                </tr>
              </thead>
              <tbody className="divide-y font-mono">
                {graph.nodes.map((n) => (
                  <tr key={n.id} className="hover:bg-muted/40 transition-colors">
                    <td className="py-1.5 px-3 font-bold text-primary">{n.id}</td>
                    <td className="py-1.5 px-3 font-sans font-medium">{n.name}</td>
                    <td className="py-1.5 px-3 text-muted-foreground">{n.type}</td>
                    <td className="py-1.5 px-3 text-right font-medium">{n.time || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TabsContent>

          <TabsContent value="edges" className="flex-1 overflow-auto border rounded-md min-h-0 m-0">
            <table className="w-full text-left text-xs border-collapse font-sans">
              <thead className="bg-muted/60 sticky top-0 border-b z-10">
                <tr>
                  <th className="py-2 px-3 font-semibold w-20">{t("colSource")}</th>
                  <th className="py-2 px-3 font-semibold w-20">{t("colTarget")}</th>
                  <th className="py-2 px-3 font-semibold">{t("colLabel")}</th>
                  <th className="py-2 px-3 font-semibold w-24 text-center">{t("colBack")}</th>
                </tr>
              </thead>
              <tbody className="divide-y font-mono">
                {graph.edges.map((e, idx) => (
                  <tr key={`edge-row-${idx}`} className="hover:bg-muted/40 transition-colors">
                    <td className="py-1.5 px-3 font-bold text-primary">{e.s}</td>
                    <td className="py-1.5 px-3 font-bold text-primary">{e.t}</td>
                    <td className="py-1.5 px-3 font-sans text-muted-foreground">
                      {e.label ? (
                        <span className="font-mono bg-muted/60 px-1.5 py-0.5 rounded text-[11px]">
                          {e.label}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-1.5 px-3 text-center">
                      {e.back ? (
                        <Badge variant="destructive" className="text-[10px] h-4.5 px-1.5 font-sans">
                          Loop
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
