"use client";

import { Check } from "lucide-react";
import { Badge, Button } from "@/components/ui";

interface InspectorHeaderProps {
  badgeLabel: string;
  title: string;
  onClose: () => void;
  doneText: string;
}

export function InspectorHeader({ badgeLabel, title, onClose, doneText }: InspectorHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-2 pb-2 border-b">
      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className="text-[10px] uppercase font-mono bg-primary/10 text-primary border-primary/30"
        >
          {badgeLabel}
        </Badge>
        <span className="font-semibold text-sm">{title}</span>
      </div>
      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onClose}>
        <Check className="size-3.5 mr-1" /> {doneText}
      </Button>
    </div>
  );
}
