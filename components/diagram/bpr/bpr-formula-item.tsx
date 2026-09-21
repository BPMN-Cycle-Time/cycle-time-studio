"use client";

import type { ReactNode } from "react";

interface BprFormulaItemProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function BprFormulaItem({ title, description, children }: BprFormulaItemProps) {
  return (
    <div className="flex flex-col gap-2 p-3 rounded-xl border border-border/40 bg-muted/30">
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-semibold text-foreground">{title}</span>
        <p className="text-[11px] text-muted-foreground leading-snug">{description}</p>
      </div>
      <div className="font-mono text-[11px] text-muted-foreground bg-muted/60 px-2.5 py-2 rounded-md border border-border/40 flex flex-col gap-1">
        {children}
      </div>
    </div>
  );
}
