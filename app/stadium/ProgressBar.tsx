"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { BWF } from "@/lib/branding";

const TARGET_PENCE = BWF.fundraisingTargetPence;

export function ProgressBar() {
  const stats = useQuery(api.donations.aggregateStats);
  const raised = stats?.raisedPence ?? 0;
  const ratio = TARGET_PENCE > 0 ? raised / TARGET_PENCE : 0;
  const pct = Math.min(100, Math.max(0, ratio * 100));
  const reached = raised >= TARGET_PENCE;

  return (
    <section
      aria-label="Campaign progress"
      data-testid="progress-bar"
      className="bg-bwf-navy border-b border-white/10 px-5 py-2.5"
    >
      <div className="mx-auto flex max-w-3xl items-center gap-3">
        <p className="font-display flex-1 truncate text-[13px] font-bold tracking-[0.5px] text-white/75 uppercase">
          {reached
            ? "Edgbaston is blue for Bob."
            : "Help turn Edgbaston blue for Bob"}
        </p>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pct)}
          aria-label={`${pct.toFixed(1)}% of target`}
          className="h-1.5 min-w-[60px] flex-[0_1_160px] overflow-hidden rounded-full bg-white/10"
        >
          <div
            data-testid="progress-fill"
            className="bg-bwf-blue-light h-full rounded-full transition-[width] duration-700"
            style={{ width: `${pct}%`, minWidth: pct > 0 ? "3px" : "0" }}
          />
        </div>
        <span className="font-display text-bwf-blue-light text-[13px] font-extrabold tracking-[0.5px]">
          {pct.toFixed(1)}%
        </span>
      </div>
    </section>
  );
}
