"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy } from "lucide-react";
import type { ProcessGraph } from "@/types";
import { nodesToCsv, edgesToCsv } from "@/services/xlsx";
import { Button, AppCard } from "@/components/ui";

interface GraphCsvTablesProps {
  graph: ProcessGraph;
}

export function GraphCsvTables({ graph }: GraphCsvTablesProps) {
  const t = useTranslations("diagram");
  const [copiedNodes, setCopiedNodes] = useState(false);
  const [copiedEdges, setCopiedEdges] = useState(false);

  const copyToClipboard = async (text: string, isNodes: boolean) => {
    try {
      await navigator.clipboard.writeText(text);
      if (isNodes) {
        setCopiedNodes(true);
        setTimeout(() => setCopiedNodes(false), 2000);
      } else {
        setCopiedEdges(true);
        setTimeout(() => setCopiedEdges(false), 2000);
      }
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      if (isNodes) {
        setCopiedNodes(true);
        setTimeout(() => setCopiedNodes(false), 2000);
      } else {
        setCopiedEdges(true);
        setTimeout(() => setCopiedEdges(false), 2000);
      }
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* nodes.csv */}
      <AppCard
        title={t("nodesCsv")}
        headerExtra={
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => copyToClipboard(nodesToCsv(graph.nodes), true)}
          >
            {copiedNodes ? (
              <>
                <Check className="size-3 mr-1 text-emerald-600" />
                {t("copied")}
              </>
            ) : (
              <>
                <Copy className="size-3 mr-1" />
                {t("copyCsv")}
              </>
            )}
          </Button>
        }
      >
        <div className="overflow-x-auto max-h-56">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b bg-muted/40 font-mono text-[11px] text-muted-foreground">
                <th className="p-2 font-semibold">Id</th>
                <th className="p-2 font-semibold">NodeName</th>
                <th className="p-2 font-semibold">NodeType</th>
                <th className="p-2 font-semibold">Time</th>
              </tr>
            </thead>
            <tbody>
              {graph.nodes.map((n) => (
                <tr key={n.id} className="border-b hover:bg-muted/30">
                  <td className="p-2 font-mono font-semibold text-primary">{n.id}</td>
                  <td className="p-2">{n.name}</td>
                  <td className="p-2 text-muted-foreground">{n.type}</td>
                  <td className="p-2 font-mono text-muted-foreground">{n.time || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AppCard>

      {/* edges.csv */}
      <AppCard
        title={t("edgesCsv")}
        headerExtra={
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => copyToClipboard(edgesToCsv(graph.edges), false)}
          >
            {copiedEdges ? (
              <>
                <Check className="size-3 mr-1 text-emerald-600" />
                {t("copied")}
              </>
            ) : (
              <>
                <Copy className="size-3 mr-1" />
                {t("copyCsv")}
              </>
            )}
          </Button>
        }
      >
        <div className="overflow-x-auto max-h-56">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b bg-muted/40 font-mono text-[11px] text-muted-foreground">
                <th className="p-2 font-semibold">Source</th>
                <th className="p-2 font-semibold">Tail</th>
                <th className="p-2 font-semibold">Label</th>
              </tr>
            </thead>
            <tbody>
              {graph.edges.map((e, idx) => (
                <tr key={idx} className="border-b hover:bg-muted/30">
                  <td className="p-2 font-mono font-semibold text-primary">{e.s}</td>
                  <td className="p-2 font-mono font-semibold text-primary">{e.t}</td>
                  <td className="p-2 font-mono text-muted-foreground">{e.label || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AppCard>
    </div>
  );
}
