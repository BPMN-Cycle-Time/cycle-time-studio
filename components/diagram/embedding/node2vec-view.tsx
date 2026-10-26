"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import type { Block, EventLogItem, Node2VecJobResult, Node2VecOptions, Task } from "@/types";
import { buildProcessGraph } from "@/services/graph";
import { buildSocialNetwork } from "@/services/social-network";
import {
  NODE2VEC_DEFAULTS,
  processGraphToLabeledGraph,
  socialNetworkToLabeledGraph,
} from "@/services/graph-embedding";
import { useGraphEmbeddingWorker } from "@/hooks";
import { AppCard, AppSelect } from "@/components/ui";
import { EmbeddingNumberField } from "./embedding-number-field";
import { EmbeddingRunControls } from "./embedding-run-controls";
import { EmbeddingScatter } from "./embedding-scatter";
import { Node2VecResults } from "./node2vec-results";

type GraphSource = "process" | "handover";

interface Node2VecViewProps {
  blocks: Block[];
  tasks?: Task[];
  events: EventLogItem[];
}

type Node2VecParams = Required<
  Pick<
    Node2VecOptions,
    "dimensions" | "walkLength" | "numWalks" | "p" | "q" | "window" | "epochs" | "seed"
  >
>;

export function Node2VecView({ blocks, tasks, events }: Node2VecViewProps) {
  const t = useTranslations("diagram.embedding.node2vec");
  const { run, cancel, running } = useGraphEmbeddingWorker();

  const [source, setSource] = useState<GraphSource>("process");
  const [params, setParams] = useState<Node2VecParams>({
    dimensions: NODE2VEC_DEFAULTS.dimensions,
    walkLength: NODE2VEC_DEFAULTS.walkLength,
    numWalks: NODE2VEC_DEFAULTS.numWalks,
    p: NODE2VEC_DEFAULTS.p,
    q: NODE2VEC_DEFAULTS.q,
    window: NODE2VEC_DEFAULTS.window,
    epochs: NODE2VEC_DEFAULTS.epochs,
    seed: NODE2VEC_DEFAULTS.seed,
  });
  const [clusters, setClusters] = useState(3);
  const [result, setResult] = useState<Node2VecJobResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState("");

  const graph = useMemo(
    () =>
      source === "process"
        ? processGraphToLabeledGraph(buildProcessGraph(blocks, tasks))
        : socialNetworkToLabeledGraph(buildSocialNetwork(events, "handover")),
    [source, blocks, tasks, events],
  );
  const labelOf = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n.label])), [graph]);
  const resultMatches =
    result && result.ids.length === graph.nodes.length && result.ids.every((id) => labelOf.has(id));

  const handleRun = async () => {
    setError(null);
    try {
      const res = await run({ kind: "node2vec", graph, options: params, clusters });
      if (res.kind !== "node2vec") return;
      setResult(res);
      setSelectedId((prev) => (res.ids.includes(prev) ? prev : (res.ids[0] ?? "")));
    } catch (err) {
      if (err instanceof Error && err.name !== "EmbeddingJobCancelledError") setError(err.message);
    }
  };

  const set = (key: keyof Node2VecParams) => (value: number) =>
    setParams((p) => ({ ...p, [key]: value }));

  return (
    <div className="flex flex-col gap-4">
      <AppCard
        title={t("settingsTitle")}
        description={t("settingsDescription")}
        contentClassName="flex flex-col gap-3"
      >
        <div className="flex flex-wrap items-end gap-3">
          <AppSelect<GraphSource>
            label={t("source")}
            size="sm"
            value={source}
            onValueChange={(v) => {
              setSource(v);
              setResult(null);
            }}
            options={[
              { value: "process", label: t("sourceProcess") },
              { value: "handover", label: t("sourceHandover"), disabled: !events.length },
            ]}
            wrapperClassName="w-[220px]"
          />
          <EmbeddingNumberField
            label={t("dimensions")}
            value={params.dimensions}
            onChange={set("dimensions")}
            min={2}
            max={128}
          />
          <EmbeddingNumberField
            label={t("walkLength")}
            value={params.walkLength}
            onChange={set("walkLength")}
            min={2}
            max={100}
          />
          <EmbeddingNumberField
            label={t("numWalks")}
            value={params.numWalks}
            onChange={set("numWalks")}
            min={1}
            max={500}
          />
          <EmbeddingNumberField
            label="p"
            value={params.p}
            onChange={set("p")}
            min={0.01}
            step={0.25}
          />
          <EmbeddingNumberField
            label="q"
            value={params.q}
            onChange={set("q")}
            min={0.01}
            step={0.25}
          />
          <EmbeddingNumberField
            label={t("window")}
            value={params.window}
            onChange={set("window")}
            min={1}
            max={20}
          />
          <EmbeddingNumberField
            label={t("epochs")}
            value={params.epochs}
            onChange={set("epochs")}
            min={1}
            max={50}
          />
          <EmbeddingNumberField
            label={t("seed")}
            value={params.seed}
            onChange={set("seed")}
            min={0}
          />
          <EmbeddingNumberField
            label={t("clusters")}
            value={clusters}
            onChange={setClusters}
            min={1}
            max={10}
          />
        </div>
        <EmbeddingRunControls
          running={running}
          onRun={handleRun}
          onCancel={cancel}
          disabled={graph.nodes.length < 2}
          hint={t("graphSize", { nodes: graph.nodes.length, edges: graph.edges.length })}
          error={error}
        />
      </AppCard>

      {result && resultMatches && (
        <>
          <AppCard title={t("scatterTitle")} description={t("scatterDescription")}>
            <EmbeddingScatter
              points={result.ids.map((id, i) => ({
                x: result.points[i]![0],
                y: result.points[i]![1],
                label: labelOf.get(id) ?? id,
                group: result.clusters[i]!,
                id,
                detail: id,
              }))}
              groupName={(g) => t("clusterName", { index: g + 1 })}
              onPointClick={(point) => setSelectedId(point.id)}
            />
          </AppCard>
          <Node2VecResults
            graph={graph}
            result={result}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </>
      )}
    </div>
  );
}
