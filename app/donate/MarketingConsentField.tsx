"use client";

import {
  recordMarketingChoice,
  type MarketingConsent,
} from "@/lib/donation/marketingConsent";

interface Props {
  value: MarketingConsent;
  onChange: (value: MarketingConsent) => void;
  /** Set to true after the donor tries to advance without answering. */
  showError?: boolean;
}

export function MarketingConsentField({
  value,
  onChange,
  showError = false,
}: Props) {
  const choose = (optIn: boolean) => onChange(recordMarketingChoice(optIn));

  return (
    <fieldset
      className="flex flex-col gap-3"
      aria-describedby={
        showError && value.state === "unanswered"
          ? "marketing-error"
          : undefined
      }
    >
      <legend className="text-base font-semibold">
        Stay in touch with the Bob Willis Fund?
      </legend>
      <p className="text-sm text-white/70">
        We&apos;ll only contact you about the campaign and BWF&apos;s work.
        Unsubscribe at any time.
      </p>

      <div className="flex flex-col gap-2">
        <label className="ring-bwf-blue/30 flex items-start gap-3 rounded-lg bg-white/5 p-3 text-sm ring-1">
          <input
            type="radio"
            name="marketing-consent"
            value="opt-in"
            checked={value.state === "opted-in"}
            onChange={() => choose(true)}
            className="mt-1"
          />
          <span>I&apos;m happy to be contacted by email.</span>
        </label>

        <label className="ring-bwf-blue/30 flex items-start gap-3 rounded-lg bg-white/5 p-3 text-sm ring-1">
          <input
            type="radio"
            name="marketing-consent"
            value="opt-out"
            checked={value.state === "opted-out"}
            onChange={() => choose(false)}
            className="mt-1"
          />
          <span>
            Please don&apos;t contact me by email for the purposes stated.
          </span>
        </label>
      </div>

      {showError && value.state === "unanswered" ? (
        <p id="marketing-error" role="alert" className="text-sm text-amber-300">
          Please select a contact preference.
        </p>
      ) : null}
    </fieldset>
  );
}
