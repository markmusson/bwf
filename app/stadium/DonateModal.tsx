"use client";

import { useEffect, useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import { CheckoutPanel } from "./CheckoutPanel";
import {
  DonateForm,
  EMPTY_DONATE_FORM_VALUE,
  type DonateFormValue,
} from "./DonateForm";

interface Props {
  seatId: Id<"seats"> | null;
  seatLabel: string | null;
  /** Minimum donation in pence — derived from the stand's tier price. */
  minimumPence?: number;
  onClose: () => void;
}

export function DonateModal({
  seatId,
  seatLabel,
  minimumPence,
  onClose,
}: Props) {
  const initialFormValue: DonateFormValue =
    minimumPence !== undefined
      ? { ...EMPTY_DONATE_FORM_VALUE, amountPence: minimumPence }
      : EMPTY_DONATE_FORM_VALUE;

  const [phase, setPhase] = useState<"form" | "pay">("form");
  const [collected, setCollected] = useState<DonateFormValue>(initialFormValue);

  useEffect(() => {
    if (!seatId) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [seatId, onClose]);

  if (!seatId) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="donate-modal-title"
      data-testid="donate-modal"
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4"
      style={{ backgroundColor: "rgba(0,20,45,0.85)" }}
    >
      <div
        className="bg-bwf-navy ring-bwf-blue/40 my-auto flex w-full max-w-md flex-col overflow-hidden rounded-2xl ring-1"
        style={{ animation: "fadeUp 0.18s ease" }}
      >
        <header className="flex items-start justify-between gap-4 px-6 pt-6">
          <div className="flex flex-col gap-3">
            <span className="ring-bwf-blue/35 font-display inline-flex w-fit items-center rounded-lg bg-[rgba(0,133,202,0.2)] px-3 py-1.5 text-[12px] font-bold tracking-[0.5px] text-white uppercase ring-1">
              {seatLabel ?? "Your seat"}
            </span>
            <h2
              id="donate-modal-title"
              className="font-display text-[26px] leading-none font-black tracking-wider text-white uppercase"
            >
              {phase === "form" ? "Claim this seat" : "Pay securely"}
            </h2>
            {phase === "form" ? (
              <p className="text-[13px] leading-snug text-white/65">
                Your donation funds prostate cancer research and helps save
                men&apos;s lives across the UK.
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ring-bwf-blue/40 -mr-2 rounded-full px-3 py-1 text-sm text-white/70 ring-1 hover:text-white"
          >
            ×
          </button>
        </header>

        <div className="overflow-y-auto px-6 pt-4 pb-6">
          {phase === "form" ? (
            // key on minimumPence so the form re-mounts and re-initialises
            // its amount when a different-tier seat is chosen.
            <DonateForm
              key={`${seatId}-${minimumPence ?? "default"}`}
              initial={collected}
              minimumPence={minimumPence}
              onContinue={(value) => {
                setCollected(value);
                setPhase("pay");
              }}
              onCancel={onClose}
            />
          ) : (
            <CheckoutPanel
              seatId={seatId}
              payload={collected}
              onBack={() => setPhase("form")}
            />
          )}
        </div>
      </div>
      <style>{`@keyframes fadeUp { from { transform: translateY(16px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }`}</style>
    </div>
  );
}
