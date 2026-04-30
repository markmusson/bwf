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
  onClose: () => void;
}

export function DonateModal({ seatId, seatLabel, onClose }: Props) {
  // The donation form / payment phase resets every time a new seat
  // becomes the modal's anchor — `key={seatId}` on the form makes that
  // happen by remounting the component tree. No setState-in-effect.
  const [phase, setPhase] = useState<"form" | "pay">("form");
  const [collected, setCollected] = useState<DonateFormValue>(
    EMPTY_DONATE_FORM_VALUE,
  );

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
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
    >
      <div className="bg-bwf-deep ring-bwf-blue/30 flex max-h-[95vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl ring-1 sm:rounded-2xl">
        <header className="border-bwf-blue/20 flex items-start justify-between gap-4 border-b px-6 py-4">
          <div>
            <p className="text-bwf-pale text-xs tracking-wide uppercase">
              {seatLabel ?? "Your seat"}
            </p>
            <h2
              id="donate-modal-title"
              className="text-2xl font-semibold tracking-tight"
            >
              {phase === "form" ? "Claim your seat" : "Pay securely"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ring-bwf-blue/40 rounded-full px-3 py-1 text-sm ring-1"
          >
            ×
          </button>
        </header>

        <div className="overflow-y-auto px-6 py-6">
          {phase === "form" ? (
            <DonateForm
              initial={collected}
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
    </div>
  );
}
