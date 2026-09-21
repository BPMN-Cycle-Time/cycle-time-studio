"use client";

import { useEffect, useState, useRef } from "react";

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  className?: string;
}

function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

export function AnimatedNumber({ value, duration = 600, className }: AnimatedNumberProps) {
  const [display, setDisplay] = useState(value);
  const currentRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (value === currentRef.current) return;

    const startValue = currentRef.current;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutQuad(progress);
      const next = startValue + (value - startValue) * eased;
      setDisplay(next);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        currentRef.current = value;
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  const rounded = Math.round(display);

  return <span className={`tabular-nums ${className ?? ""}`.trim()}>{rounded}</span>;
}
