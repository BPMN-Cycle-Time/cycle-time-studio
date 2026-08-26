"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { ContributionRow } from "@/types";
import { Badge } from "@/components/ui";

export function ContributionChart({ rows, unit }: { rows: ContributionRow[]; unit: string }) {
  const t = useTranslations("editor");
  const { visible, maxVal } = useMemo(() => {
    const v = rows.filter((r) => !r.excluded);
    const max = Math.max(1e-9, ...v.map((r) => r.expected));
    return { visible: v, maxVal: max };
  }, [rows]);

  if (visible.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("addStepNotice")}</p>;
  }

  return (
    <div className="flex flex-col gap-2.5">
      {visible.map((r) => (
        <div
          key={r.id + r.kind}
          className="grid grid-cols-[minmax(96px,168px)_1fr_62px_46px] gap-3 items-center"
        >
          <div
            className="text-sm truncate flex items-baseline gap-1.5"
            style={{ paddingLeft: r.depth * 14 }}
          >
            <span className={r.kind === "branch" ? "truncate text-muted-foreground" : "truncate"}>
              {r.label}
            </span>
            {r.multiplier !== undefined && (
              <Badge variant="outline" className="font-mono text-[0.65rem] px-1 py-0 h-4">
                ×{r.multiplier.toFixed(2)}
              </Badge>
            )}
          </div>
          <div className="h-3.5 rounded bg-muted overflow-hidden">
            <div
              className="h-full rounded-r bg-primary"
              style={{ width: `${Math.max(2, (r.expected / maxVal) * 100)}%` }}
            />
          </div>
          <div className="font-mono text-sm text-right tabular-nums">
            {r.expected.toFixed(2)} {r.kind === "block" ? unit.slice(0, 1) : ""}
          </div>
          <div className="font-mono text-sm text-muted-foreground text-right tabular-nums">
            {(r.share * 100).toFixed(0)}%
          </div>
        </div>
      ))}
    </div>
  );
}
