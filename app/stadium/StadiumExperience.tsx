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

      <section className="bg-bwf-blue px-4 py-8">
        <div className="mx-auto flex max-w-3xl flex-col gap-6">
          <div className="bg-bwf-deep/40 ring-bwf-blue/30 rounded-2xl p-3 ring-1">
            <StadiumCanvas />
          </div>
          <SeatStatesKey />
          <StandLegend />
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
