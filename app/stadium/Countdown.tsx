"use client";

import { useEffect, useState } from "react";
import { computeCountdown, type CountdownParts } from "@/lib/countdown";

interface Props {
  targetIso: string;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

export function Countdown({ targetIso }: Props) {
  const targetMs = new Date(targetIso).getTime();
  const [parts, setParts] = useState<CountdownParts>(() =>
    computeCountdown(targetMs, Date.now()),
  );

  useEffect(() => {
    const tick = () => setParts(computeCountdown(targetMs, Date.now()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [targetMs]);

  const cells: Array<{ label: string; value: number }> = [
    { label: "Days", value: parts.days },
    { label: "Hrs", value: parts.hours },
    { label: "Min", value: parts.minutes },
    { label: "Sec", value: parts.seconds },
  ];

  return (
    <section
      aria-label="Countdown to match day"
      className="bg-bwf-dark border-bwf-blue/20 flex items-center justify-center gap-3 border-b py-3"
    >
      <span className="font-display text-[10px] tracking-[2px] text-white/60">
        Countdown
      </span>
      {cells.map((cell, i) => (
        <span key={cell.label} className="flex items-center gap-3">
          <span className="flex flex-col items-center">
            <span
              className="font-display bg-bwf-navy ring-bwf-blue/40 rounded-md px-2.5 py-1 text-xl text-white tabular-nums ring-1"
              data-testid={`countdown-${cell.label.toLowerCase()}`}
            >
              {pad(cell.value)}
            </span>
            <span className="font-display mt-1 text-[9px] tracking-[1.5px] text-white/55">
              {cell.label}
            </span>
          </span>
          {i < cells.length - 1 ? (
            <span className="text-white/40" aria-hidden>
              :
            </span>
          ) : null}
        </span>
      ))}
    </section>
  );
}
