"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { BWF } from "@/lib/branding";
import { formatGbpPence } from "@/lib/money";

const TARGET_PENCE = BWF.fundraisingTargetPence;

export function ProgressBar() {
  const stats = useQuery(api.donations.aggregateStats);
  const raised = stats?.raisedPence ?? 0;
  const ratio = TARGET_PENCE > 0 ? raised / TARGET_PENCE : 0;
  const pct = Math.min(100, Math.max(0, Math.round(ratio * 100)));
  const reachedTarget = raised >= TARGET_PENCE;

  return (
    <section
      aria-label="Campaign progress"
      data-testid="progress-bar"
      className="bg-bwf-mid/30 ring-bwf-blue/20 flex flex-col gap-2 rounded-2xl px-5 py-4 ring-1"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <p className="text-sm font-medium text-white">
          {reachedTarget ? "Edgbaston is blue." : "Help turn Edgbaston blue."}
        </p>
        <p className="text-bwf-pale text-sm">
          <strong>{formatGbpPence(raised)}</strong>{" "}
          <span className="text-white/60">
            of {formatGbpPence(TARGET_PENCE)}
          </span>
        </p>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={`${pct}% of target`}
        className="bg-bwf-deep ring-bwf-blue/40 h-2 overflow-hidden rounded-full ring-1"
      >
        <div
          data-testid="progress-fill"
          className="bg-bwf-blue h-full transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-white/60">{pct}% of the way to the target.</p>
    </section>
  );
}
