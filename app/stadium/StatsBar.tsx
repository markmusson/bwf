"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatGbpPence } from "@/lib/money";

interface Stat {
  label: string;
  value: string;
  emphasis?: boolean;
}

const ZERO_STATS = {
  raisedPence: 0,
  seatsBlue: 0,
  supporters: 0,
  totalSeats: 0,
};

export function StatsBar() {
  const data = useQuery(api.donations.aggregateStats);
  const loading = data === undefined;
  const stats = data ?? ZERO_STATS;

  const display: Stat[] = [
    {
      label: "Raised",
      value: formatGbpPence(stats.raisedPence),
      emphasis: true,
    },
    {
      label: "Seats Blue",
      value: stats.seatsBlue.toLocaleString("en-GB"),
    },
    {
      label: "Supporters",
      value: stats.supporters.toLocaleString("en-GB"),
    },
    {
      label: "Virtual Seats",
      value: stats.totalSeats.toLocaleString("en-GB"),
    },
  ];

  return (
    <section
      aria-label="Campaign statistics"
      data-testid="stats-bar"
      data-loading={loading ? "true" : "false"}
      className="border-bwf-blue/20 bg-bwf-mid/20 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border sm:grid-cols-4"
    >
      {display.map((stat) => (
        <div
          key={stat.label}
          className="bg-bwf-deep flex flex-col items-center gap-1 px-4 py-5 text-center"
        >
          <span
            className={[
              "text-2xl font-semibold tracking-tight sm:text-3xl",
              stat.emphasis ? "text-bwf-blue" : "text-white",
            ].join(" ")}
          >
            {stat.value}
          </span>
          <span className="text-xs tracking-wide text-white/60 uppercase">
            {stat.label}
          </span>
        </div>
      ))}
    </section>
  );
}
