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
      className="font-display flex flex-wrap items-stretch justify-center gap-1.5 text-[12px] font-bold tracking-[0.5px] text-white/85 uppercase"
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
              className="ring-bwf-blue/30 relative flex items-center gap-2 overflow-hidden rounded-full px-4 py-2 ring-1 transition-colors hover:brightness-110"
              style={{ backgroundColor: "#2E699E" }}
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
                data-testid={`stand-count-${stand.id}`}
                className="relative ml-1 text-[10px] text-white/75 tabular-nums"
              >
                {stat.taken}/{stat.total}
              </span>
              {/* Hidden node kept for the tile data-testid surface; all
                  seats are £10 across the campaign. */}
              <span data-testid={`stand-price-${stand.id}`} className="sr-only">
                {formatPrice(stand.pricePence)}
              </span>
            </Tag>
          </li>
        );
      })}
    </ul>
  );
}
