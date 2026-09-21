"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp } from "lucide-react";

import { AppCard, Button } from "@/components/ui";

import { BprFormulaItem } from "./bpr-formula-item";

function MathVar({ children }: { children: ReactNode }) {
  return <span className="text-indigo-600 dark:text-indigo-400 font-medium">{children}</span>;
}

function MathOp({ children }: { children: ReactNode }) {
  return <span className="text-muted-foreground">{children}</span>;
}

function Fraction({ numerator, denominator }: { numerator: ReactNode; denominator: ReactNode }) {
  return (
    <span className="inline-flex flex-col items-center align-middle mx-0.5 text-[11px]">
      <span className="px-1">{numerator}</span>
      <span className="w-full h-px bg-current" />
      <span className="px-1">{denominator}</span>
    </span>
  );
}

function MathRow({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5">{children}</div>;
}

export function BprFormulasSection() {
  const t = useTranslations("bpr");
  const [open, setOpen] = useState(false);

  return (
    <AppCard
      title={t("sections.formulas")}
      description={t("formulas.description")}
      headerExtra={
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 px-2 text-[11px] gap-1 cursor-pointer"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? t("formulas.collapse") : t("formulas.expand")}
        >
          <span>{open ? t("formulas.collapse") : t("formulas.expand")}</span>
          {open ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
        </Button>
      }
      contentClassName="flex flex-col gap-3"
    >
      {open && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <BprFormulaItem
            title={t("formulas.items.bottleneck.title")}
            description={t("formulas.items.bottleneck.description")}
          >
            <MathRow>
              <MathVar>share</MathVar>
              <MathOp>=</MathOp>
              <Fraction numerator={<MathVar>T</MathVar>} denominator={<MathVar>CT</MathVar>} />
              <MathOp>× 100%</MathOp>
            </MathRow>
            <MathRow>
              <MathVar>qualify</MathVar>
              <MathOp>: T ≥ 15% × CT and top 3</MathOp>
            </MathRow>
            <MathRow>
              <MathVar>severity</MathVar>
              <MathOp>: share ≥ 40% → critical, ≥ 25% → high, else medium</MathOp>
            </MathRow>
          </BprFormulaItem>

          <BprFormulaItem
            title={t("formulas.items.reworkLoop.title")}
            description={t("formulas.items.reworkLoop.description")}
          >
            <MathRow>
              <MathVar>r</MathVar>
              <MathOp>= loopP / 100</MathOp>
            </MathRow>
            <MathRow>
              <MathVar>M</MathVar>
              <MathOp>=</MathOp>
              <Fraction
                numerator={<>1</>}
                denominator={
                  <>
                    1 − <MathVar>r</MathVar>
                  </>
                }
              />
            </MathRow>
            <MathRow>
              <MathVar>severity</MathVar>
              <MathOp>: loopP ≥ 50% → critical, ≥ 25% → high, else medium</MathOp>
            </MathRow>
          </BprFormulaItem>

          <BprFormulaItem
            title={t("formulas.items.conformanceFitness.title")}
            description={t("formulas.items.conformanceFitness.description")}
          >
            <MathRow>
              <MathVar>fitness</MathVar>
              <sub className="text-[9px]">case</sub>
              <MathOp>= (1 − min(1, violations / benchmarkSteps)) × 100</MathOp>
            </MathRow>
            <MathRow>
              <MathVar>fitness</MathVar>
              <sub className="text-[9px]">overall</sub>
              <MathOp>= average(fitness</MathOp>
              <sub className="text-[9px]">case</sub>
              <MathOp>)</MathOp>
            </MathRow>
          </BprFormulaItem>

          <BprFormulaItem
            title={t("formulas.items.slaCompliance.title")}
            description={t("formulas.items.slaCompliance.description")}
          >
            <MathRow>
              <MathVar>status</MathVar>
              <MathOp>= met if duration ≤ benchmark, else delayed</MathOp>
            </MathRow>
            <MathRow>
              <MathVar>compliance</MathVar>
              <sub className="text-[9px]">task</sub>
              <MathOp>= met / total × 100%</MathOp>
            </MathRow>
            <MathRow>
              <MathVar>compliance</MathVar>
              <sub className="text-[9px]">overall</sub>
              <MathOp>= totalMet / totalInstances × 100%</MathOp>
            </MathRow>
          </BprFormulaItem>
        </div>
      )}
    </AppCard>
  );
}
