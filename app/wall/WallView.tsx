"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { api } from "@/convex/_generated/api";
import { STANDS } from "@/lib/stands";

function describeSeat(seat: {
  stand: string;
  row: number;
  num: number;
}): string {
  const stand = STANDS.find((s) => s.id === seat.stand);
  return `${stand?.name ?? seat.stand} · Row ${seat.row + 1}, Seat ${seat.num + 1}`;
}

export function WallView() {
  const groups = useQuery(api.tributes.listApproved);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!groups) return [];
    const needle = search.trim().toLowerCase();
    if (!needle) return groups;
    // Any-of search: a seat appears if ANY of its tributes (or names),
    // or the stand id itself, contains the needle.
    return groups.filter((g) => {
      if (g.seat.stand.toLowerCase().includes(needle)) return true;
      if (g.seat.slug.toLowerCase().includes(needle)) return true;
      return g.tributes.some((t) =>
        [t.text, t.displayName ?? ""].join(" ").toLowerCase().includes(needle),
      );
    });
  }, [groups, search]);

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
          Every approved tribute, grouped by seat. Newest first.{" "}
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

      {groups === undefined ? (
        <p
          className="text-center text-sm text-white/70"
          data-testid="wall-loading"
        >
          Loading tributes…
        </p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-sm text-white/70">
          {groups.length === 0
            ? "No tributes have been published yet. Be the first."
            : "No tributes match that search."}
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {filtered.map((group) => (
            <li
              key={group.seatId}
              data-testid={`seat-group-${group.seatId}`}
              className="bg-bwf-navy ring-bwf-blue/30 flex flex-col items-center gap-3 rounded-xl p-4 text-center ring-1"
            >
              <div className="flex flex-col items-center gap-1 text-xs text-white/65">
                <Link
                  href={`/seat/${group.seat.slug}`}
                  className="font-display tracking-widest text-white uppercase hover:text-white"
                >
                  {describeSeat(group.seat)}
                </Link>
                <span>
                  {group.donors === 1 ? "1 donor" : `${group.donors} donors`}
                  {group.tributes.length > 1
                    ? ` · ${group.tributes.length} tributes`
                    : ""}
                </span>
              </div>

              <ul className="divide-bwf-blue/15 flex w-full flex-col items-center divide-y">
                {group.tributes.map((tribute) => (
                  <li
                    key={tribute.tributeId}
                    data-testid={`tribute-${tribute.tributeId}`}
                    className="flex w-full flex-col items-center gap-1 py-2 first:pt-0 last:pb-0"
                  >
                    <span className="font-display text-bwf-pale text-[10px] tracking-[1.5px] uppercase">
                      {tribute.displayName ?? "Anonymous"}
                    </span>
                    <p className="max-w-prose text-[15px] leading-snug text-white">
                      {tribute.text}
                    </p>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
