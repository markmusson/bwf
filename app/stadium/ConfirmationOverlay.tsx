"use client";

import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { formatGbpPence } from "@/lib/money";

interface Props {
  sessionId: string | null;
  onClose: () => void;
}

function errorMessage(err: unknown): string {
  if (err instanceof ConvexError) {
    if (err.data === "donation_not_paid")
      return "Your payment is still going through — try again in a moment.";
    if (err.data === "forbidden")
      return "That donation is signed in to a different account.";
    if (err.data === "unauthenticated") return "Please sign in again.";
    if (typeof err.data === "string") return err.data;
  }
  if (err instanceof Error) return err.message;
  return "Couldn't enter the prize draw.";
}

export function ConfirmationOverlay({ sessionId, onClose }: Props) {
  const donation = useQuery(
    api.donations.getBySession,
    sessionId ? { stripeSessionId: sessionId } : "skip",
  );
  const isEntered = useQuery(
    api.prizeDraw.isEntered,
    donation && donation.status === "paid"
      ? { donationId: donation._id }
      : "skip",
  );
  const optIn = useMutation(api.prizeDraw.optIn);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justEntered, setJustEntered] = useState(false);

  if (!sessionId) return null;

  const enter = async () => {
    if (!donation) return;
    setSubmitting(true);
    setError(null);
    try {
      await optIn({ donationId: donation._id });
      setJustEntered(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const entered = justEntered || isEntered === true;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      data-testid="confirmation-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,20,45,0.85)] p-4"
    >
      <div className="bg-bwf-navy ring-bwf-blue/40 max-w-md rounded-2xl px-6 pt-6 pb-5 text-center text-white ring-1">
        {donation === undefined ? (
          <p className="text-sm text-white/70" data-testid="confirm-loading">
            Loading your donation…
          </p>
        ) : donation === null ? (
          <>
            <h2 id="confirm-title" className="font-display text-2xl">
              We couldn&apos;t find that donation
            </h2>
            <p className="mt-2 text-sm text-white/70">
              The session id didn&apos;t match. If you just paid, refresh —
              Stripe&apos;s webhook is on its way.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="font-display bg-bwf-blue hover:bg-bwf-blue-light mt-5 w-full rounded-lg px-5 py-3 text-base tracking-wider text-white"
            >
              Back to Edgbaston
            </button>
          </>
        ) : donation.status !== "paid" ? (
          <>
            <h2 id="confirm-title" className="font-display text-2xl">
              Processing your donation
            </h2>
            <p className="mt-2 text-sm text-white/70">
              Your payment is going through. This pane updates as soon as Stripe
              confirms — no need to refresh.
            </p>
          </>
        ) : (
          <>
            <div
              className="bg-bwf-blue mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full"
              aria-hidden
            >
              <span className="text-white">✓</span>
            </div>
            <h2 id="confirm-title" className="font-display text-3xl">
              Seat is blue!
            </h2>
            <p className="mt-2 text-sm text-white/75">
              Thank you for supporting the Bob Willis Fund. We&apos;ve recorded
              your <strong>{formatGbpPence(donation.amountPence)}</strong>{" "}
              donation. A receipt is on its way.
            </p>

            <div className="ring-bwf-blue/30 mt-4 rounded-xl bg-[rgba(0,133,202,0.1)] p-4 text-left text-sm">
              <h3 className="font-display text-bwf-gold text-base">
                Enter the prize draw — free
              </h3>
              <p className="mt-2 text-white/70">
                Separate from your donation. Keeps your Gift Aid valid. Postal
                entries are also accepted via the address on the prize T&amp;Cs
                page.
              </p>
              {error ? (
                <p role="alert" className="mt-2 text-xs text-amber-300">
                  {error}
                </p>
              ) : null}
              <button
                type="button"
                onClick={enter}
                disabled={submitting || entered}
                data-testid="prize-optin-button"
                className="font-display bg-bwf-blue hover:bg-bwf-blue-light mt-3 w-full rounded-lg px-5 py-2.5 text-sm tracking-wider text-white disabled:opacity-60"
              >
                {entered
                  ? "You're entered"
                  : submitting
                    ? "Entering…"
                    : "Enter the prize draw"}
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="ring-bwf-blue/30 mt-4 w-full rounded-lg px-5 py-3 text-sm text-white/70 ring-1"
            >
              Back to Edgbaston
            </button>
          </>
        )}
      </div>
    </div>
  );
}
