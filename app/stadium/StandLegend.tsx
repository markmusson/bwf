"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { STANDS } from "@/lib/stands";

interface Props {
  onStandClick?: (standId: string) => void;
}

const TIER_DOT: Record<string, string> = {
  premium: "#0055a0",
  standard: "#003880",
  general: "#002e68",
};

function formatPrice(pence: number): string {
  return `£${Math.round(pence / 100)}`;
}

export function StandLegend({ onStandClick }: Props) {
  const counts = useQuery(api.seats.standCounts);

  return (
    <ul
      aria-label="Stands"
      className="font-display flex flex-wrap items-stretch justify-center gap-1.5 text-[11px] font-medium tracking-[1px] text-white/80 uppercase"
    >
      {STANDS.map((stand) => {
        const stat = counts?.[stand.id] ?? { taken: 0, total: 0 };
        const pct =
          stat.total > 0 ? Math.round((stat.taken / stat.total) * 100) : 0;
        const interactive = onStandClick !== undefined;
        const Tag = interactive ? "button" : "div";
        return (
          <li key={stand.id}>
            <Tag
              type={interactive ? "button" : undefined}
              onClick={interactive ? () => onStandClick?.(stand.id) : undefined}
              data-testid={`stand-tile-${stand.id}`}
              className="bg-bwf-mid/30 ring-bwf-blue/30 relative flex items-center gap-2 overflow-hidden rounded-full px-3 py-1.5 ring-1 transition-colors hover:bg-white/10"
            >
              <span
                aria-hidden
                data-testid={`stand-fill-${stand.id}`}
                className="bg-bwf-blue/25 absolute inset-y-0 left-0"
                style={{ width: `${pct}%` }}
              />
              <span
                aria-hidden
                className="ring-bwf-blue/50 relative inline-block h-2 w-2 shrink-0 rounded-full ring-1"
                style={{ backgroundColor: TIER_DOT[stand.tier] ?? "#003880" }}
              />
              <span className="relative text-white">{stand.name}</span>
              <span
                data-testid={`stand-price-${stand.id}`}
                className="text-bwf-gold relative ml-1 font-medium tracking-wider"
              >
                {formatPrice(stand.pricePence)}
              </span>
              <span
                data-testid={`stand-count-${stand.id}`}
                className="relative text-[10px] text-white/50 tabular-nums"
              >
                {stat.taken}/{stat.total}
              </span>
            </Tag>
          </li>
        );
      })}
    </ul>
  );
}
