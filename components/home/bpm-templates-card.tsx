"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowUpRight, GitBranch, Layers, RotateCcw, Shuffle, Sparkles } from "lucide-react";
import { v4 as uuid } from "uuid";

import { Button } from "@/components/ui/button";
import { useProjectsIndex, saveProjectData } from "@/store/useProjectsIndex";
import { BlockType, BlockMode, type Project } from "@/types";

export function BpmTemplatesCard() {
  const t = useTranslations("home");
  const router = useRouter();
  const { createProject } = useProjectsIndex();

  const handleCreateFromTemplate = (
    templateType: "seq" | "xor" | "and" | "loop",
    templateName: string,
  ) => {
    const project = createProject(templateName);

    let customBlocks: Project["blocks"] = [];

    if (templateType === "seq") {
      customBlocks = [
        {
          id: uuid(),
          type: BlockType.SEQ,
          label: t("templateSeqBlock1"),
          time: 2,
          mode: BlockMode.SIMPLE,
        },
        {
          id: uuid(),
          type: BlockType.SEQ,
          label: t("templateSeqBlock2"),
          time: 3,
          mode: BlockMode.SIMPLE,
        },
      ];
    } else if (templateType === "xor") {
      customBlocks = [
        {
          id: uuid(),
          type: BlockType.XOR,
          label: t("templateXorLabel"),
          branches: [
            { id: uuid(), label: t("templateXorBranchFast", { p: 70 }), p: 70, t: 1.5 },
            { id: uuid(), label: t("templateXorBranchStandard", { p: 30 }), p: 30, t: 4 },
          ],
        },
      ];
    } else if (templateType === "and") {
      customBlocks = [
        {
          id: uuid(),
          type: BlockType.AND,
          label: t("templateAndLabel"),
          branches: [
            { id: uuid(), label: t("templateAndBranchAlpha"), t: 2.5 },
            { id: uuid(), label: t("templateAndBranchBeta"), t: 4 },
          ],
        },
      ];
    } else if (templateType === "loop") {
      customBlocks = [
        {
          id: uuid(),
          type: BlockType.LOOP,
          label: t("templateLoopLabel"),
          time: 2,
          loopP: 25,
          loopTime: 1.5,
          mode: BlockMode.SIMPLE,
        },
      ];
    }

    const updatedProject: Project = {
      ...project,
      blocks: customBlocks,
      updatedAt: project.updatedAt,
    };

    saveProjectData(updatedProject);
    router.push(`/project/${project.id}`);
  };

  const templates = [
    {
      id: "seq" as const,
      name: t("templateSequenceName"),
      desc: t("templateSequenceDesc"),
      formula: "T = Σ tᵢ",
      icon: Layers,
      color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    },
    {
      id: "xor" as const,
      name: t("templateXorName"),
      desc: t("templateXorDesc"),
      formula: "T = Σ (pᵢ · tᵢ)",
      icon: Shuffle,
      color: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    },
    {
      id: "and" as const,
      name: t("templateAndName"),
      desc: t("templateAndDesc"),
      formula: "T = max(tᵢ)",
      icon: GitBranch,
      color: "bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20",
    },
    {
      id: "loop" as const,
      name: t("templateLoopName"),
      desc: t("templateLoopDesc"),
      formula: "T = t / (1 - r)",
      icon: RotateCcw,
      color: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
    },
  ];

  return (
    <div className="rounded-2xl bg-card border border-border/80 p-5 shadow-xs flex flex-col gap-3.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-sm text-foreground tracking-tight">{t("quickActions")}</h3>
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full font-medium">
          <Sparkles className="size-2.5" />
          <span>{t("bpmnBadge")}</span>
        </span>
      </div>

      {/* Interactive Template List — 1-column layout prevents wrapping */}
      <div className="flex flex-col gap-2">
        {templates.map((tpl) => {
          const Icon = tpl.icon;
          return (
            <Button
              key={tpl.id}
              variant="ghost"
              onClick={() => handleCreateFromTemplate(tpl.id, tpl.name)}
              className="p-2.5 h-auto rounded-xl border border-border/70 bg-background/50 hover:bg-card hover:border-primary/40 hover:shadow-xs flex items-center justify-between gap-3 transition-all duration-200 text-left group w-full"
            >
              {/* Left: Icon + Title & Desc */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`size-8 rounded-xl flex items-center justify-center border shrink-0 ${tpl.color} shadow-2xs group-hover:scale-105 transition-transform`}
                >
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs text-foreground group-hover:text-primary transition-colors tracking-tight truncate">
                    {tpl.name}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">{tpl.desc}</div>
                </div>
              </div>

              {/* Right: Formula Pill + Arrow Action */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-mono font-medium text-muted-foreground bg-muted/80 px-2 py-0.5 rounded-md border border-border/40 whitespace-nowrap">
                  {tpl.formula}
                </span>
                <div className="size-6 rounded-full bg-muted/60 group-hover:bg-primary group-hover:text-primary-foreground flex items-center justify-center text-muted-foreground transition-all">
                  <ArrowUpRight className="size-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </div>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
