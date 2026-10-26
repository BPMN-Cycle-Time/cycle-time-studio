"use client";

import { useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Upload } from "lucide-react";

import type { Block, Task } from "@/types";
import { bpmnXmlToBlocks } from "@/services/bpmn";
import { buildProcessGraph } from "@/services/graph";
import { compareProcessGraphs, processGraphToLabeledGraph } from "@/services/graph-embedding";
import { useEditorStore } from "@/store/useEditorStore";
import { loadProject, useProjectsIndex } from "@/store/useProjectsIndex";
import { AppCard, AppSelect, Button, DataTable, type TableColumn } from "@/components/ui";

interface ModelCompareViewProps {
  blocks: Block[];
  tasks?: Task[];
}

interface Target {
  name: string;
  blocks: Block[];
  tasks: Task[];
}

interface StatRow {
  metric: string;
  current: number;
  target: number;
}

/** AS-IS (current project) vs TO-BE (another project or an uploaded .bpmn) with the WL kernel. */
export function ModelCompareView({ blocks, tasks }: ModelCompareViewProps) {
  const t = useTranslations("diagram.embedding.compare");
  const currentId = useEditorStore((s) => s.project?.id);
  const projects = useProjectsIndex((s) => s.projects);
  const inputRef = useRef<HTMLInputElement>(null);

  const [target, setTarget] = useState<Target | null>(null);
  const [projectId, setProjectId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const comparison = useMemo(() => {
    if (!target) return null;
    const a = processGraphToLabeledGraph(buildProcessGraph(blocks, tasks));
    const b = processGraphToLabeledGraph(buildProcessGraph(target.blocks, target.tasks));
    return compareProcessGraphs(a, b, 2);
  }, [blocks, tasks, target]);

  const pickProject = (id: string) => {
    setProjectId(id);
    setError(null);
    const project = loadProject(id);
    if (project) setTarget({ name: project.name, blocks: project.blocks, tasks: project.tasks });
    else setError(t("loadFailed"));
  };

  const pickFile = async (file: File) => {
    setError(null);
    try {
      const res = await bpmnXmlToBlocks(await file.text(), []);
      if (!res.blocks.length) throw new Error(res.warnings.join(" "));
      setProjectId("");
      setTarget({ name: file.name, blocks: res.blocks, tasks: res.tasks });
    } catch (err) {
      setError(t("bpmnFailed", { message: err instanceof Error ? err.message : String(err) }));
    }
  };

  const statRows: StatRow[] = comparison
    ? [
        { metric: t("nodes"), current: comparison.a.nodes, target: comparison.b.nodes },
        { metric: t("edges"), current: comparison.a.edges, target: comparison.b.edges },
        {
          metric: t("cyclomatic"),
          current: comparison.a.cyclomatic,
          target: comparison.b.cyclomatic,
        },
      ]
    : [];
  const columns: TableColumn<StatRow>[] = [
    {
      key: "metric",
      header: t("metric"),
      render: (r) => <span className="text-xs font-medium">{r.metric}</span>,
    },
    {
      key: "current",
      header: t("current"),
      render: (r) => <span className="font-mono text-xs">{r.current}</span>,
    },
    {
      key: "target",
      header: target?.name ?? t("target"),
      render: (r) => <span className="font-mono text-xs">{r.target}</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <AppCard
        title={t("title")}
        description={t("description")}
        contentClassName="flex flex-wrap items-end gap-3"
      >
        <AppSelect
          label={t("otherProject")}
          size="sm"
          value={projectId}
          onValueChange={pickProject}
          options={projects
            .filter((p) => p.id !== currentId)
            .map((p) => ({ value: p.id, label: p.name }))}
          placeholder={t("chooseProject")}
          wrapperClassName="w-[240px]"
        />
        <span className="text-xs text-muted-foreground pb-2">{t("or")}</span>
        <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
          <Upload className="size-3.5 mr-1.5" />
          {t("uploadBpmn")}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".bpmn,.xml"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void pickFile(file);
          }}
        />
        {error && <span className="text-xs text-destructive pb-2">{error}</span>}
      </AppCard>

      {comparison && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <AppCard title={t("similarityTitle", { name: target?.name ?? "" })}>
            <div className="text-3xl font-bold font-mono text-primary">
              {(comparison.similarity * 100).toFixed(1)}%
            </div>
            <div className="mt-3 flex flex-col gap-1.5">
              {comparison.perIteration.map((sim, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="w-28 text-muted-foreground">{t("iteration", { index: i })}</span>
                  <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${Math.max(0, sim) * 100}%` }}
                    />
                  </div>
                  <span className="w-14 text-right font-mono">{(sim * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">{t("iterationHint")}</p>
          </AppCard>
          <AppCard title={t("statsTitle")}>
            <DataTable<StatRow>
              data={statRows}
              columns={columns}
              showSearch={false}
              showPagination={false}
              showCopyCsv={false}
              getRowId={(r) => r.metric}
            />
          </AppCard>
        </div>
      )}
    </div>
  );
}
