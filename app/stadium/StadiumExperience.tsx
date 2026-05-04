"use client";

import { useMutation, useQuery } from "convex/react";
import { useMemo } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { BWF } from "@/lib/branding";
import { useClientHoldId } from "@/lib/clientHoldId";
import { STANDS } from "@/lib/stands";
import { Countdown } from "./Countdown";
import { DonateModal } from "./DonateModal";
import { ProgressBar } from "./ProgressBar";
import { SeatStatesKey } from "./SeatStatesKey";
import { StadiumCanvas } from "./StadiumCanvas";
import { StandLegend } from "./StandLegend";
import { StatsBar } from "./StatsBar";

export function StadiumExperience() {
  const clientHoldId = useClientHoldId();

  const hold = useQuery(
    api.holds.getMine,
    clientHoldId ? { clientHoldId } : "skip",
  );
  const seats = useQuery(api.seats.list);
  const releaseHold = useMutation(api.holds.release);

  const heldSeatStand = useMemo(() => {
    if (!hold || !seats) return null;
    const row = seats.find((s) => s._id === hold.seatId);
    if (!row) return null;
    return { row, stand: STANDS.find((s) => s.id === row.stand) ?? null };
  }, [hold, seats]);

  const seatLabel = useMemo<string | null>(() => {
    if (!heldSeatStand) return null;
    const { row, stand } = heldSeatStand;
    const standName = stand?.name ?? row.stand;
    return `${standName} · Row ${row.row + 1}, Seat ${row.num + 1}`;
  }, [heldSeatStand]);

  const minimumPence = heldSeatStand?.stand?.pricePence;

  const closeDonateModal = async () => {
    if (hold && clientHoldId) {
      try {
        await releaseHold({ holdId: hold._id, clientHoldId });
      } catch {
        // best-effort release; cron will clean up if this fails
      }
    }
  };

  const donateSeatId: Id<"seats"> | null = hold ? hold.seatId : null;

  return (
    <>
      <Countdown targetIso={BWF.matchDayIso} />
      <StatsBar />
      <ProgressBar />

      {/* Combined mission + click instructions — one block above the
          map, no second header inside the canvas. Saves vertical
          space and keeps the WHY visible at first paint. */}
      <section
        aria-label="Campaign mission"
        className="bg-bwf-navy/80 border-bwf-blue-light/20 border-b px-5 py-3"
      >
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-1 text-center">
          <p className="font-display text-bwf-pale text-[11px] font-semibold tracking-[2px] uppercase">
            Why blue for Bob?
          </p>
          <p className="text-[15px] leading-snug text-white">
            £10 turns a virtual seat blue and funds prostate cancer
            research in Bob Willis&apos;s name. Every donation enters
            you into the prize draw.
          </p>
          <p className="mt-0.5 text-[12px] leading-snug text-white/75">
            Click any seat below to claim it. Hover a claimed seat to
            read its tribute.
          </p>
        </div>
      </section>

      <section className="bg-bwf-blue px-2 pt-3 pb-6 sm:px-4 sm:pt-4 sm:pb-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-5">
          <StadiumCanvas />
          <div className="mx-auto w-full max-w-3xl">
            <StandLegend />
          </div>
          <div className="mx-auto w-full max-w-3xl">
            <SeatStatesKey />
          </div>
        </div>
      </section>

      <DonateModal
        key={`${donateSeatId ?? "none"}-${minimumPence ?? "x"}`}
        seatId={donateSeatId}
        seatLabel={seatLabel}
        minimumPence={minimumPence}
        onClose={closeDonateModal}
      />
    </>
  );
}
