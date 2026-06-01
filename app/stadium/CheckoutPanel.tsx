"use client";

import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useAction } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getOrCreateClientHoldId } from "@/lib/clientHoldId";
import { formatGbpPence } from "@/lib/money";
import type { DonateFormValue } from "./DonateForm";

interface Props {
  seatId: Id<"seats">;
  payload: DonateFormValue;
  onBack: () => void;
}

interface CreateSessionResult {
  clientSecret: string;
  donationId: Id<"donations">;
}

function payloadToActionArgs(
  seatId: Id<"seats">,
  payload: DonateFormValue,
  clientHoldId: string,
) {
  const giftAidConfirmations = payload.giftAid.enabled
    ? {
        ukTaxpayer: payload.giftAid.confirmations.ukTaxpayer,
        ownMoney: payload.giftAid.confirmations.ownMoney,
        noBenefit: payload.giftAid.confirmations.noBenefit,
        declaredAt: Date.now(),
      }
    : undefined;

  const marketingOptIn =
    payload.marketing.state === "opted-in"
      ? true
      : payload.marketing.state === "opted-out"
        ? false
        : undefined;

  const marketingConsentRecordedAt =
    payload.marketing.state !== "unanswered"
      ? payload.marketing.recordedAt
      : undefined;

  const tributeText = payload.tribute.text.trim() || undefined;
  const displayName = payload.tribute.hideName
    ? undefined
    : payload.donorName.trim() || undefined;
  const recipientName = payload.tribute.recipientName.trim() || undefined;

  return {
    clientHoldId,
    seatId,
    amountPence: payload.amountPence,
    giftAid: payload.giftAid.enabled,
    giftAidConfirmations,
    hideName: payload.tribute.hideName,
    hideAmount: payload.tribute.hideAmount,
    displayName,
    recipientName,
    marketingOptIn,
    marketingConsentRecordedAt,
    tributeText,
  };
}

export function CheckoutPanel({ seatId, payload, onBack }: Props) {
  const createSession = useAction(api.stripe.createSession);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stripePromise = useMemo(() => {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!key) return null;
    return loadStripe(key);
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const clientHoldId = getOrCreateClientHoldId();
        const result: CreateSessionResult = await createSession(
          payloadToActionArgs(seatId, payload, clientHoldId),
        );
        if (!cancelled) {
          setClientSecret(result.clientSecret);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Couldn't start checkout.",
          );
          setClientSecret(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [seatId, payload, createSession]);

  return (
    <div className="flex flex-col gap-4">
      <div className="ring-bwf-blue/30 bg-bwf-deep flex items-center justify-between gap-3 rounded-xl p-4 ring-1">
        <div>
          <p className="text-xs tracking-wide text-white/60 uppercase">
            Confirm and pay
          </p>
          <p className="text-2xl font-semibold">
            {formatGbpPence(payload.amountPence)}
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="ring-bwf-blue/40 rounded-full px-4 py-2 text-sm ring-1"
        >
          Back
        </button>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-amber-300">
          {error}
        </p>
      ) : null}

      {!stripePromise ? (
        <p role="alert" className="text-sm text-amber-300">
          Stripe is not configured. Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in
          .env.local.
        </p>
      ) : !clientSecret ? (
        <p className="text-sm text-white/70" data-testid="checkout-loading">
          Preparing your checkout…
        </p>
      ) : (
        <div data-testid="embedded-checkout-mount">
          <EmbeddedCheckoutProvider
            stripe={stripePromise}
            options={{ clientSecret }}
          >
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
      )}
    </div>
  );
}
