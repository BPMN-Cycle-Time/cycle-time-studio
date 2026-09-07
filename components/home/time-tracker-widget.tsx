"use client";

import { useState, useEffect } from "react";
import { Play, Pause, RotateCcw, Timer } from "lucide-react";
import { useTranslations } from "next-intl";

export function TimeTrackerWidget() {
  const t = useTranslations("Home");
  const [seconds, setSeconds] = useState(5048); // 01:24:08 like Donezo
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (!isRunning) return;
    const timer = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isRunning]);

  const formatTime = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <div className="rounded-2xl p-5 bg-[#0A2618] dark:bg-[#061A10] text-white flex flex-col justify-between shadow-sm relative overflow-hidden min-h-[190px] border border-emerald-950/60">
      {/* Background radial ambient glow & texture */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(34,197,94,0.15),transparent_60%)] pointer-events-none" />
      <div className="absolute -bottom-10 -right-10 size-36 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
            <Timer className="size-3.5" />
          </div>
          <span className="font-semibold text-xs tracking-tight text-white/90">
            {t("timeTracker")}
          </span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-emerald-300 border border-emerald-500/20">
          {t("cycleTimeLive")}
        </span>
      </div>

      {/* Big Digital Clock — Donezo style */}
      <div className="my-3 text-center z-10">
        <span className="font-mono text-4xl font-bold tracking-wider text-white drop-shadow-sm select-none">
          {formatTime(seconds)}
        </span>
      </div>

      {/* Controls — circular buttons */}
      <div className="flex items-center justify-center gap-3 z-10">
        <button
          type="button"
          onClick={() => setIsRunning((prev) => !prev)}
          className="size-10 rounded-full bg-white text-emerald-950 hover:bg-white/90 flex items-center justify-center shadow-sm active:scale-95 transition-all cursor-pointer"
          title={isRunning ? "Pause" : "Start"}
        >
          {isRunning ? (
            <Pause className="size-4 fill-current" />
          ) : (
            <Play className="size-4 fill-current ml-0.5" />
          )}
        </button>
        <button
          type="button"
          onClick={() => {
            setIsRunning(false);
            setSeconds(0);
          }}
          className="size-10 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:bg-rose-500/30 flex items-center justify-center shadow-sm active:scale-95 transition-all cursor-pointer"
          title="Reset"
        >
          <RotateCcw className="size-4" />
        </button>
      </div>
    </div>
  );
}
