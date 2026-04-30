"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatGbpPence } from "@/lib/money";

interface StatCell {
  label: string;
  value: string;
  color: "gold" | "blue-light" | "white" | "coral";
}

const ZERO_STATS = {
  raisedPence: 0,
  seatsBlue: 0,
  supporters: 0,
  totalSeats: 0,
};

function colorClass(color: StatCell["color"]): string {
  switch (color) {
    case "gold":
      return "text-bwf-gold";
    case "blue-light":
      return "text-bwf-blue-light";
    case "white":
      return "text-white";
    case "coral":
      return "text-bwf-coral";
  }
}

export function StatsBar() {
  const data = useQuery(api.donations.aggregateStats);
  const loading = data === undefined;
  const stats = data ?? ZERO_STATS;
  const remaining = Math.max(0, stats.totalSeats - stats.seatsBlue);

  const cells: StatCell[] = [
    {
      label: "Raised",
      value: formatGbpPence(stats.raisedPence),
      color: "gold",
    },
    {
      label: "Seats Turned Blue",
      value: stats.seatsBlue.toLocaleString("en-GB"),
      color: "blue-light",
    },
    {
      label: "Supporters",
      value: stats.supporters.toLocaleString("en-GB"),
      color: "white",
    },
    {
      label: "Remaining Seats",
      value: remaining.toLocaleString("en-GB"),
      color: "coral",
    },
  ];

  return (
    <section
      aria-label="Campaign statistics"
      data-testid="stats-bar"
      data-loading={loading ? "true" : "false"}
      className="bg-bwf-dark border-b border-white/10"
    >
      <div className="mx-auto flex max-w-3xl flex-wrap">
        {cells.map((cell, idx) => (
          <div
            key={cell.label}
            className={[
              "flex min-w-[50%] flex-1 flex-col items-center justify-center px-2 py-3 text-center",
              idx < cells.length - 1 ? "sm:border-r sm:border-white/10" : "",
            ].join(" ")}
          >
            <span
              className={`font-display text-[clamp(20px,4vw,28px)] ${colorClass(cell.color)}`}
            >
              {cell.value}
            </span>
            <span className="font-display mt-1 text-[9px] tracking-[2px] text-white/60">
              {cell.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
