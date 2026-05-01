"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { STANDS } from "@/lib/stands";

interface Props {
  onStandClick?: (standId: string) => void;
}

export function StandLegend({ onStandClick }: Props) {
  const counts = useQuery(api.seats.standCounts);

  return (
    <ul
      aria-label="Stands"
      className="grid auto-rows-fr grid-cols-2 gap-2 text-xs text-white/80 sm:grid-cols-3 lg:grid-cols-6"
    >
      {STANDS.map((stand) => {
        const stat = counts?.[stand.id] ?? { taken: 0, total: 0 };
        const pct =
          stat.total > 0 ? Math.round((stat.taken / stat.total) * 100) : 0;
        const interactive = onStandClick !== undefined;
        const Tag = interactive ? "button" : "div";
        return (
          <li key={stand.id} className="h-full">
            <Tag
              type={interactive ? "button" : undefined}
              onClick={interactive ? () => onStandClick?.(stand.id) : undefined}
              data-testid={`stand-tile-${stand.id}`}
              className="bg-bwf-mid/30 ring-bwf-blue/30 flex h-full w-full flex-col gap-2 rounded-xl p-3 text-left ring-1 transition-colors hover:bg-white/10"
            >
              <div className="flex flex-1 items-start">
                <span className="text-sm leading-tight font-semibold text-white">
                  {stand.name}
                </span>
              </div>
              <div className="bg-bwf-deep ring-bwf-blue/40 h-1.5 overflow-hidden rounded-full ring-1">
                <div
                  data-testid={`stand-fill-${stand.id}`}
                  className="bg-bwf-blue h-full"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-white/70">
                <span>{stand.tier}</span>
                <span>
                  <strong className="text-white">{stat.taken}</strong> /{" "}
                  {stat.total} seats
                </span>
              </div>
            </Tag>
          </li>
        );
      })}
    </ul>
  );
}
