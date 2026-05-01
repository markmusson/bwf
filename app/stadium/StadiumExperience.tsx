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

  const seatLabel = useMemo<string | null>(() => {
    if (!hold || !seats) return null;
    const row = seats.find((s) => s._id === hold.seatId);
    if (!row) return null;
    const stand = STANDS.find((s) => s.id === row.stand);
    const standName = stand?.name ?? row.stand;
    return `${standName} · Row ${row.row + 1}, Seat ${row.num + 1}`;
  }, [hold, seats]);

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

      <section className="bg-bwf-blue px-4 py-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-5">
          <StadiumCanvas />
          <SeatStatesKey />
          <StandLegend />
        </div>
      </section>

      <DonateModal
        seatId={donateSeatId}
        seatLabel={seatLabel}
        onClose={closeDonateModal}
      />
    </>
  );
}
