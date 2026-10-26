"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";

/** Formats a duration in hours: minutes below 1 h, hours up to 48 h, then days. */
export function useFormatHours(): (hours: number | null | undefined) => string {
  const t = useTranslations("diagram.performance.units");
  return useCallback(
    (hours) => {
      if (hours === null || hours === undefined || !Number.isFinite(hours)) return "—";
      if (hours < 1) return t("minutes", { value: (hours * 60).toFixed(1) });
      if (hours < 48) return t("hours", { value: hours.toFixed(2) });
      return t("days", { value: (hours / 24).toFixed(1), hours: hours.toFixed(0) });
    },
    [t],
  );
}

export const formatShare = (share: number): string => `${(share * 100).toFixed(1)}%`;
