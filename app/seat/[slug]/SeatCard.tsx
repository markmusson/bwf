"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { STANDS } from "@/lib/stands";

interface CardProps {
  slug: string;
}

function describeSeat(seat: {
  stand: string;
  row: number;
  num: number;
}): string {
  const stand = STANDS.find((s) => s.id === seat.stand);
  return `${stand?.name ?? seat.stand} · Row ${seat.row + 1}, Seat ${seat.num + 1}`;
}

function formatGBP(pence: number): string {
  const pounds = pence / 100;
  return pounds % 1 === 0 ? `£${pounds.toFixed(0)}` : `£${pounds.toFixed(2)}`;
}

export function SeatCard({ slug }: CardProps) {
  const card = useQuery(api.seats.getCardBySlug, { slug });

  if (card === undefined) {
    return (
      <section
        className="bg-bwf-blue mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center px-6 py-10 text-white"
        data-testid="seat-card-loading"
        aria-busy="true"
      >
        <p className="text-sm text-white/70">Loading seat…</p>
      </section>
    );
  }

  if (card === null) {
    return (
      <section className="bg-bwf-blue mx-auto flex max-w-2xl flex-col gap-6 px-6 py-12 text-center text-white">
        <h1 className="font-display text-3xl">Seat not found</h1>
        <p className="text-sm text-white/70">
          Seat URLs look like{" "}
          <code className="text-bwf-pale">/seat/hollies-3-12</code> — stand id,
          row, seat (1-indexed).
        </p>
        <Link
          href="/stadium"
          className="bg-bwf-pale text-bwf-navy font-display mx-auto rounded-full px-5 py-2 text-sm tracking-wider uppercase"
        >
          Back to the stadium
        </Link>
      </section>
    );
  }

  const seatLabel = describeSeat(card.seat);

  // Unclaimed seat — no donations, no tributes.
  if (card.donors === 0) {
    return (
      <section className="bg-bwf-blue mx-auto flex max-w-2xl flex-col gap-6 px-6 py-12 text-center text-white">
        <p className="text-bwf-pale text-xs tracking-widest uppercase">
          {seatLabel}
        </p>
        <h1 className="font-display text-3xl">This seat is unclaimed</h1>
        <p className="text-sm text-white/70">
          Be the first to turn this Edgbaston seat blue for Bob.
        </p>
        <Link
          href="/stadium"
          className="bg-bwf-pale text-bwf-navy font-display mx-auto rounded-full px-5 py-2 text-sm tracking-wider uppercase"
        >
          Claim this seat
        </Link>
      </section>
    );
  }

  return (
    <section
      className="bg-bwf-blue mx-auto flex max-w-2xl flex-col gap-6 px-6 py-12 text-white"
      data-testid="seat-card"
    >
      <header className="flex flex-col gap-2 text-center">
        <p className="text-bwf-pale text-xs tracking-widest uppercase">
          {seatLabel}
        </p>
        <h1 className="font-display text-3xl">A seat turned blue for Bob</h1>
        <p className="text-sm text-white/70">
          {card.donors === 1 ? "1 donor" : `${card.donors} donors`} ·{" "}
          {formatGBP(card.raisedPence)} raised on this seat
        </p>
      </header>

      {card.tributes.length === 0 ? (
        <p className="text-center text-sm text-white/60">
          No tribute messages on this seat yet.
        </p>
      ) : (
        <ul
          className="bg-bwf-navy ring-bwf-blue/30 divide-bwf-blue/15 flex flex-col divide-y rounded-2xl p-5 ring-1"
          data-testid="seat-tributes"
        >
          {card.tributes.map((tribute) => (
            <li
              key={tribute.tributeId}
              data-testid={`seat-tribute-${tribute.tributeId}`}
              className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <span className="font-display text-base">
                  {tribute.displayName ?? "Anonymous"}
                </span>
                {tribute.amountPence !== null ? (
                  <span className="text-bwf-pale text-xs tracking-wider">
                    {formatGBP(tribute.amountPence)}
                    {tribute.giftAid ? " · Gift Aid" : ""}
                  </span>
                ) : null}
              </div>
              <p className="text-[15px] leading-snug text-white/90">
                {tribute.text}
              </p>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/stadium"
          className="bg-bwf-pale text-bwf-navy font-display rounded-full px-5 py-2 text-sm tracking-wider uppercase"
        >
          Pick your seat
        </Link>
        <Link
          href="/wall"
          className="ring-bwf-pale/40 font-display rounded-full px-5 py-2 text-sm tracking-wider uppercase ring-1 hover:bg-white/10"
        >
          See the wall
        </Link>
      </div>
    </section>
  );
}
