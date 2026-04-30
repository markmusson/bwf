"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import {
  isMarketingConsentAnswered,
  UNANSWERED_MARKETING_CONSENT,
  type MarketingConsent,
} from "@/lib/donation/marketingConsent";
import { MarketingConsentField } from "./MarketingConsentField";
import {
  EMPTY_GIFT_AID_VALUE,
  StepGiftAid,
  type StepGiftAidValue,
} from "./StepGiftAid";
import { StepPay } from "./StepPay";

const MOCK_AMOUNT_PENCE = 1000;

const STEP_HEADINGS = [
  "Choose your donation",
  "Your email",
  "Your details",
  "Leave a tribute",
  "Add Gift Aid",
  "Build your avatar",
  "Pay securely",
  "Thank you",
] as const;

const BREADCRUMB_STEPS = [
  "Select",
  "Details",
  "Message",
  "Gift Aid",
  "Pay",
  "Complete",
] as const;

const BREADCRUMB_INDEX_FOR_STEP = [0, 1, 1, 2, 3, 3, 4, 5] as const;

const FINAL_STEP = STEP_HEADINGS.length;

type StepNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

function isStepNumber(value: number): value is StepNumber {
  return value >= 1 && value <= FINAL_STEP;
}

export function DonationWizard() {
  const hold = useQuery(api.holds.getMine);
  const [step, setStep] = useState<StepNumber>(1);
  const [giftAid, setGiftAid] =
    useState<StepGiftAidValue>(EMPTY_GIFT_AID_VALUE);
  const [marketing, setMarketing] = useState<MarketingConsent>(
    UNANSWERED_MARKETING_CONSENT,
  );
  const [marketingError, setMarketingError] = useState(false);

  if (hold === null) {
    return (
      <section
        aria-label="No active hold"
        className="bg-bwf-deep mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-4 px-6 py-12 text-center text-white"
      >
        <h1 className="text-3xl font-semibold tracking-tight">
          Pick a seat first
        </h1>
        <p className="text-white/70">
          Your seat hold has expired or hasn&apos;t been claimed yet. Head back
          to the stadium and choose one.
        </p>
        <Link
          href="/stadium"
          className="bg-bwf-blue hover:bg-bwf-accent rounded-full px-5 py-2 text-sm font-medium text-white transition-colors"
        >
          Back to the stadium
        </Link>
      </section>
    );
  }

  const heading = STEP_HEADINGS[step - 1] ?? STEP_HEADINGS[0];
  const breadcrumbIndex = BREADCRUMB_INDEX_FOR_STEP[step - 1] ?? 0;

  const goNext = () => {
    if (step === 3 && !isMarketingConsentAnswered(marketing)) {
      setMarketingError(true);
      return;
    }
    const next = step + 1;
    if (isStepNumber(next)) setStep(next);
  };

  const goBack = () => {
    const prev = step - 1;
    if (isStepNumber(prev)) setStep(prev);
  };

  return (
    <section
      aria-label="Donation wizard"
      className="bg-bwf-deep mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-6 py-12 text-white"
    >
      <ol
        aria-label="Wizard progress"
        className="flex flex-wrap items-center gap-2 text-xs tracking-wide uppercase"
      >
        {BREADCRUMB_STEPS.map((label, index) => {
          const isCurrent = index === breadcrumbIndex;
          const isComplete = index < breadcrumbIndex;
          return (
            <li
              key={label}
              aria-current={isCurrent ? "step" : undefined}
              data-state={
                isCurrent ? "current" : isComplete ? "complete" : "upcoming"
              }
              className={[
                "rounded-full px-3 py-1 ring-1",
                isCurrent
                  ? "bg-bwf-blue/30 ring-bwf-blue text-white"
                  : isComplete
                    ? "text-bwf-pale ring-bwf-blue/40"
                    : "text-white/40 ring-white/15",
              ].join(" ")}
            >
              {label}
            </li>
          );
        })}
      </ol>

      <header className="flex flex-col gap-1">
        <p className="text-xs tracking-wide text-white/60 uppercase">
          Step {step} of {FINAL_STEP}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {heading}
        </h1>
      </header>

      <div
        role="region"
        aria-label={`Step ${step}: ${heading}`}
        className="bg-bwf-mid/30 ring-bwf-blue/20 flex-1 rounded-2xl p-6 ring-1"
      >
        {step === 3 ? (
          <div className="flex flex-col gap-6">
            <p className="text-sm text-white/70">
              Name, address autocomplete, and T&Cs land in their own tasks.
              Marketing preference is captured here per PECR.
            </p>
            <MarketingConsentField
              value={marketing}
              onChange={(next) => {
                setMarketing(next);
                setMarketingError(false);
              }}
              showError={marketingError}
            />
          </div>
        ) : step === 5 ? (
          <StepGiftAid
            amountPence={MOCK_AMOUNT_PENCE}
            value={giftAid}
            onChange={setGiftAid}
          />
        ) : step === 7 && hold ? (
          <StepPay
            seatId={hold.seatId}
            amountPence={MOCK_AMOUNT_PENCE}
            giftAid={giftAid}
            marketing={marketing}
          />
        ) : (
          <p className="text-sm text-white/70">
            Mock content. The real form lands as part of the payment-loop work
            in Stage 2.
          </p>
        )}
      </div>

      <nav
        aria-label="Wizard navigation"
        className="flex items-center justify-between"
      >
        <button
          type="button"
          onClick={goBack}
          disabled={step === 1}
          className="ring-bwf-blue/40 rounded-full px-5 py-2 text-sm font-medium ring-1 disabled:opacity-30"
        >
          Back
        </button>
        <button
          type="button"
          onClick={goNext}
          disabled={step === FINAL_STEP}
          className="bg-bwf-blue hover:bg-bwf-accent rounded-full px-5 py-2 text-sm font-medium text-white transition-colors disabled:opacity-30"
        >
          {step === FINAL_STEP - 1 ? "Pay" : "Next"}
        </button>
      </nav>
    </section>
  );
}
