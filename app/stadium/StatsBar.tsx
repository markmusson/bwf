"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatGbpPenceCompact } from "@/lib/money";

interface StatCell {
  label: string;
  value: string;
  color: "gold" | "blue-light" | "white";
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
  }
}

export function StatsBar() {
  const data = useQuery(api.donations.aggregateStats);
  const loading = data === undefined;
  const stats = data ?? ZERO_STATS;
  const pct =
    stats.totalSeats > 0
      ? Math.round((stats.seatsBlue / stats.totalSeats) * 100)
      : 0;

  const cells: StatCell[] = [
    {
      label: "Raised",
      value: formatGbpPenceCompact(stats.raisedPence),
      color: "gold",
    },
    {
      label: "Seats Blue",
      value: stats.seatsBlue.toLocaleString("en-GB"),
      color: "blue-light",
    },
    {
      label: "Supporters",
      value: stats.supporters.toLocaleString("en-GB"),
      color: "white",
    },
    {
      label: "Virtual Seats",
      value: stats.totalSeats.toLocaleString("en-GB"),
      color: "white",
    },
  ];

  return (
    <section
      aria-label="Campaign statistics"
      data-testid="stats-bar"
      data-loading={loading ? "true" : "false"}
      className="bg-bwf-dark border-b border-white/10"
    >
      <div className="mx-auto max-w-3xl px-2 pt-3 pb-1">
        <div data-testid="stats-grid" className="grid grid-cols-4 gap-1">
          {cells.map((cell) => (
            <div
              key={cell.label}
              className="flex flex-col items-center justify-center text-center"
            >
              <span
                className={`font-display text-[clamp(18px,4vw,28px)] leading-none ${colorClass(cell.color)}`}
              >
                {cell.value}
              </span>
              <span className="font-display mt-1 text-[9px] tracking-[2px] text-white/60 uppercase">
                {cell.label}
              </span>
            </div>
          ))}
        </div>
        <p
          data-testid="stats-pct"
          className="text-bwf-blue-light/80 mt-1 pb-2 text-center text-[11px] tracking-[2px] uppercase"
        >
          {pct}% claimed
        </p>
      </div>
    </section>
  );
}
