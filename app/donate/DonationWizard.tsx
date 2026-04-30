"use client";

import { useState } from "react";

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
  const [step, setStep] = useState<StepNumber>(1);

  const heading = STEP_HEADINGS[step - 1] ?? STEP_HEADINGS[0];
  const breadcrumbIndex = BREADCRUMB_INDEX_FOR_STEP[step - 1] ?? 0;

  const goNext = () => {
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
        <p className="text-sm text-white/70">
          Mock content. The real form lands as part of the payment-loop work in
          Stage 2.
        </p>
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
