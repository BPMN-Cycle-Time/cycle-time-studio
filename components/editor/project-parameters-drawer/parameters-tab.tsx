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
      <ProjectTotalsCard total={flow?.total ?? 0} unit={project.unit} />

      {/* Time Sheet */}
      <TimeSheetCard tasks={project.tasks ?? []} blocks={project.blocks} unit={project.unit} />

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
