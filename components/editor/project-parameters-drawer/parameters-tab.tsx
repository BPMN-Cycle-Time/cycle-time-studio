"use client";

import { useTranslations } from "next-intl";
import type { Project, FlowResult } from "@/types";
import {
  ProjectTotalsCard,
  TimeSheetCard,
  ProcessFlowSection,
  ContributionChart,
  MonteCarloPanel,
} from "@/components/editor";
import { AppCard } from "@/components/ui";

interface ParametersTabProps {
  project: Project;
  flow: FlowResult | null;
}

export function ParametersTab({ project, flow }: ParametersTabProps) {
  const tEd = useTranslations("editor");
  const tSim = useTranslations("simulation");

  return (
    <div className="flex flex-col gap-6">
      {/* Totals */}
      <ProjectTotalsCard
        total={flow?.total ?? 0}
        unit={project.unit}
        totalCost={flow?.totalCost ?? 0}
        laborCost={flow?.laborCost ?? 0}
        fixedCost={flow?.fixedCost ?? 0}
        currency={project.currency}
      />

      {/* Time Sheet */}
      <TimeSheetCard
        tasks={project.tasks ?? []}
        blocks={project.blocks}
        unit={project.unit}
        currency={project.currency}
      />

      {/* Block editor */}
      <ProcessFlowSection blocks={project.blocks} unit={project.unit} />

      {/* Contribution chart */}
      <AppCard title={tEd("whereTimeGoes")}>
        {flow && <ContributionChart rows={flow.contributions} unit={project.unit} />}
      </AppCard>

      {/* Monte Carlo */}
      <AppCard title={tSim("title")}>
        <MonteCarloPanel blocks={project.blocks} unit={project.unit} />
      </AppCard>
    </div>
  );
}
