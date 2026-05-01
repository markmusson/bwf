"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { api } from "@/convex/_generated/api";
import { formatSeatSlug } from "@/lib/seatSlug";
import { STANDS } from "@/lib/stands";

function describeSeat(
  seat: { stand: string; row: number; num: number } | null,
): string {
  if (!seat) return "Seat pending";
  const stand = STANDS.find((s) => s.id === seat.stand);
  return `${stand?.name ?? seat.stand} · Row ${seat.row + 1}, Seat ${seat.num + 1}`;
}

export function WallView() {
  const tributes = useQuery(api.tributes.listApproved);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!tributes) return [];
    const needle = search.trim().toLowerCase();
    if (!needle) return tributes;
    return tributes.filter((t) => {
      const haystack = [t.text, t.displayName ?? "", t.seat?.stand ?? ""]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [tributes, search]);

  return (
    <section
      aria-label="Tribute wall"
      className="bg-bwf-blue mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10 text-white"
    >
      <header className="flex flex-col gap-2 text-center">
        <p className="text-bwf-pale text-xs tracking-widest uppercase">
          The wall
        </p>
        <h1 className="font-display text-4xl">Tributes for Bob</h1>
        <p className="text-sm text-white/75">
          Every tribute left by a donor at Edgbaston, in order. Want to add
          yours?{" "}
          <Link href="/stadium" className="underline hover:text-white">
            Pick a seat.
          </Link>
        </p>
      </header>

      <label className="flex flex-col gap-1">
        <span className="font-display text-[10px] tracking-[1.5px] text-white/60 uppercase">
          Search
        </span>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Find a name, stand, or word…"
          className="ring-bwf-blue/40 rounded-lg bg-white/10 px-3 py-2 text-base ring-1 outline-none focus:ring-2"
        />
      </label>

      {tributes === undefined ? (
        <p
          className="text-center text-sm text-white/70"
          data-testid="wall-loading"
        >
          Loading tributes…
        </p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-sm text-white/70">
          {tributes.length === 0
            ? "No tributes have been published yet. Be the first."
            : "No tributes match that search."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((tribute) => (
            <li
              key={tribute.tributeId}
              data-testid={`tribute-${tribute.tributeId}`}
              className="bg-bwf-navy ring-bwf-blue/30 flex flex-col gap-2 rounded-xl p-4 ring-1"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-3 text-xs text-white/60">
                <span className="font-display tracking-widest uppercase">
                  {tribute.displayName ?? "Anonymous"}
                </span>
                {tribute.seat ? (
                  <Link
                    href={`/seat/${formatSeatSlug(tribute.seat)}`}
                    className="hover:text-white"
                  >
                    {describeSeat(tribute.seat)}
                  </Link>
                ) : (
                  <span>{describeSeat(tribute.seat)}</span>
                )}
              </div>
              <p className="text-base text-white">{tribute.text}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
