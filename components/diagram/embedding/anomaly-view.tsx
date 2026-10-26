"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Columns3 } from "lucide-react";

import type {
  AnomalyEvaluation,
  Block,
  EventLogItem,
  LabelModeComparisonResult,
  Task,
  TraceEmbeddingJobResult,
  TraceEmbeddingSettings,
  TraceLabelMode,
} from "@/types";
import { analyzeConformance } from "@/services/conformance";
import {
  GRAPH2VEC_DEFAULTS,
  TRACE_LABEL_MODES,
  evaluateAnomalyScores,
} from "@/services/graph-embedding";
import { useGraphEmbeddingWorker } from "@/hooks";
import { AppCard, Button } from "@/components/ui";
import { AnomalySettings } from "./anomaly-settings";
import { AnomalyCaseTable } from "./anomaly-case-table";
import { AnomalyMetricsTable } from "./anomaly-metrics-table";
import { EmbeddingRunControls } from "./embedding-run-controls";
import { EmbeddingScatter } from "./embedding-scatter";
import { GroundTruthButton } from "./ground-truth-button";

interface AnomalyViewProps {
  blocks: Block[];
  tasks?: Task[];
  events: EventLogItem[];
}

const DEFAULT_ATTRIBUTE = "review_result";

export function AnomalyView({ blocks, tasks, events }: AnomalyViewProps) {
  const t = useTranslations("diagram.embedding.anomaly");
  const { run, cancel, running } = useGraphEmbeddingWorker();

  const attributeKeys = useMemo(
    () => [...new Set(events.flatMap((e) => Object.keys(e.attributes ?? {})))].sort(),
    [events],
  );
  const [mode, setMode] = useState<TraceLabelMode>("timeAware");
  const [settings, setSettings] = useState<TraceEmbeddingSettings>(() => ({
    method: "graph2vec",
    k: 20,
    slowQuantile: 0.9,
    attributeKeys: [],
    graph2vec: {
      dimensions: GRAPH2VEC_DEFAULTS.dimensions,
      epochs: GRAPH2VEC_DEFAULTS.epochs,
      seed: GRAPH2VEC_DEFAULTS.seed,
    },
  }));
  // Attribute key defaults to review_result (or the first attribute) once the log is known.
  const effectiveSettings: TraceEmbeddingSettings = settings.attributeKeys.length
    ? settings
    : {
        ...settings,
        attributeKeys: attributeKeys.includes(DEFAULT_ATTRIBUTE)
          ? [DEFAULT_ATTRIBUTE]
          : attributeKeys.slice(0, 1),
      };

  const [result, setResult] = useState<TraceEmbeddingJobResult | null>(null);
  const [resultMode, setResultMode] = useState<TraceLabelMode>(mode);
  const [comparison, setComparison] = useState<LabelModeComparisonResult | null>(null);
  const [groundTruth, setGroundTruth] = useState<Record<string, string[]> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const execute = async (comparing: boolean) => {
    setError(null);
    const runMode = mode;
    try {
      const res = await run(
        comparing
          ? { kind: "compareLabelModes", events, settings: effectiveSettings }
          : { kind: "traceEmbedding", events, mode, settings: effectiveSettings },
      );
      if (res.kind === "traceEmbedding") {
        setResult(res);
        setResultMode(runMode);
      }
      if (res.kind === "compareLabelModes") setComparison(res);
    } catch (err) {
      if (err instanceof Error && err.name !== "EmbeddingJobCancelledError") setError(err.message);
    }
  };

  const conformanceByType = useMemo(() => {
    if (!groundTruth || !blocks.length) return {};
    const flagged = new Set(
      analyzeConformance(events, blocks, tasks)
        .caseResults.filter((c) => !c.isConformant)
        .map((c) => c.caseId),
    );
    const totals = new Map<string, { n: number; hit: number }>();
    for (const [caseId, types] of Object.entries(groundTruth)) {
      for (const type of types) {
        const cur = totals.get(type) ?? { n: 0, hit: 0 };
        totals.set(type, { n: cur.n + 1, hit: cur.hit + (flagged.has(caseId) ? 1 : 0) });
      }
    }
    return Object.fromEntries([...totals].map(([type, v]) => [type, v.hit / v.n]));
  }, [groundTruth, events, blocks, tasks]);

  const evaluation = useMemo<AnomalyEvaluation | null>(
    () =>
      result && groundTruth
        ? evaluateAnomalyScores(
            result.cases.map((c) => c.caseId),
            result.cases.map((c) => c.score),
            groundTruth,
          )
        : null,
    [result, groundTruth],
  );
  const comparisonEvaluations = useMemo(() => {
    if (!comparison || !groundTruth) return null;
    return Object.fromEntries(
      TRACE_LABEL_MODES.map((m) => [
        m,
        evaluateAnomalyScores(comparison.caseIds, comparison.scores[m], groundTruth),
      ]),
    ) as Record<TraceLabelMode, AnomalyEvaluation>;
  }, [comparison, groundTruth]);

  const topN = result ? Math.max(1, Math.round(result.cases.length * 0.1)) : 0;
  const topSet = useMemo(
    () =>
      new Set(
        result
          ? [...result.cases]
              .sort((a, b) => b.score - a.score)
              .slice(0, topN)
              .map((c) => c.caseId)
          : [],
      ),
    [result, topN],
  );
  const isAnomalous = (caseId: string) =>
    groundTruth ? (groundTruth[caseId]?.length ?? 0) > 0 : topSet.has(caseId);

  return (
    <div className="flex flex-col gap-4">
      <AppCard
        title={t("settingsTitle")}
        description={t("settingsDescription")}
        contentClassName="flex flex-col gap-3"
      >
        <AnomalySettings
          settings={effectiveSettings}
          onChange={setSettings}
          mode={mode}
          onModeChange={setMode}
          attributeKeys={attributeKeys}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <EmbeddingRunControls
            running={running}
            onRun={() => execute(false)}
            onCancel={cancel}
            disabled={!events.length}
            hint={t("caseHint", { cases: new Set(events.map((e) => e.caseId)).size })}
            error={error}
          />
          <div className="flex flex-wrap items-center gap-2">
            <GroundTruthButton loaded={groundTruth} onLoad={setGroundTruth} onError={setError} />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => execute(true)}
              disabled={running || !events.length || !attributeKeys.length}
            >
              <Columns3 className="size-3.5 mr-1.5" />
              {t("compareModes")}
            </Button>
          </div>
        </div>
      </AppCard>

      {comparisonEvaluations && (
        <AnomalyMetricsTable
          title={t("compareTitle")}
          description={t("compareDescription", {
            attribute: effectiveSettings.attributeKeys[0] ?? "—",
          })}
          evaluations={comparisonEvaluations}
          conformanceByType={conformanceByType}
        />
      )}
      {comparison && !groundTruth && (
        <p className="text-xs text-muted-foreground">{t("compareNeedsGroundTruth")}</p>
      )}

      {result && (
        <>
          {evaluation && (
            <AnomalyMetricsTable
              title={t("metricsTitle")}
              evaluations={{ [resultMode]: evaluation }}
              conformanceByType={conformanceByType}
            />
          )}
          <AppCard
            title={t("scatterTitle")}
            description={
              groundTruth ? t("scatterDescriptionGt") : t("scatterDescriptionTop", { count: topN })
            }
          >
            <EmbeddingScatter
              showLabels={false}
              points={result.cases.map((c, i) => ({
                x: result.points[i]![0],
                y: result.points[i]![1],
                label: c.caseId,
                id: c.caseId,
                group: isAnomalous(c.caseId) ? 4 : 0,
                detail: `${t("score")}: ${c.score.toFixed(4)}${groundTruth?.[c.caseId]?.length ? ` · ${groundTruth[c.caseId]!.join(", ")}` : ""}`,
              }))}
              groupName={(g) =>
                g === 4 ? (groundTruth ? t("labelled") : t("topScored")) : t("normal")
              }
            />
          </AppCard>
          <AnomalyCaseTable cases={result.cases} groundTruth={groundTruth} />
        </>
      )}
    </div>
  );
}
