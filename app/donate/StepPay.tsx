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
import type { MarketingConsent } from "@/lib/donation/marketingConsent";
import type { StepGiftAidValue } from "./StepGiftAid";

interface Props {
  seatId: Id<"seats">;
  amountPence: number;
  giftAid: StepGiftAidValue;
  marketing: MarketingConsent;
}

interface CreateSessionResult {
  clientSecret: string;
  donationId: Id<"donations">;
}

export function StepPay({ seatId, amountPence, giftAid, marketing }: Props) {
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
        const result: CreateSessionResult = await createSession({
          seatId,
          amountPence,
          giftAid: giftAid.enabled,
          giftAidConfirmations: giftAid.enabled
            ? {
                ukTaxpayer: giftAid.confirmations.ukTaxpayer,
                ownMoney: giftAid.confirmations.ownMoney,
                noBenefit: giftAid.confirmations.noBenefit,
                declaredAt: Date.now(),
              }
            : undefined,
          hideName: false,
          hideAmount: false,
          marketingOptIn:
            marketing.state === "opted-in"
              ? true
              : marketing.state === "opted-out"
                ? false
                : undefined,
          marketingConsentRecordedAt:
            marketing.state !== "unanswered" ? marketing.recordedAt : undefined,
        });
        if (!cancelled) setClientSecret(result.clientSecret);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Couldn't start checkout",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [seatId, amountPence, giftAid, marketing, createSession]);

  if (error) {
    return (
      <p role="alert" className="text-sm text-amber-300">
        {error}
      </p>
    );
  }

  if (!stripePromise) {
    return (
      <p className="text-sm text-amber-300">
        Stripe is not configured. Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in
        .env.local.
      </p>
    );
  }

  if (!clientSecret) {
    return (
      <p className="text-sm text-white/70" data-testid="checkout-loading">
        Preparing your checkout…
      </p>
    );
  }

  return (
    <div data-testid="embedded-checkout-mount">
      <EmbeddedCheckoutProvider
        stripe={stripePromise}
        options={{ clientSecret }}
      >
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
