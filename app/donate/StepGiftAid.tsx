"use client";

import {
  calculateGiftAidUpliftPence,
  EMPTY_GIFT_AID_CONFIRMATIONS,
  isGiftAidValid,
  type GiftAidConfirmations,
} from "@/lib/donation/giftAid";
import { formatGbpPence } from "@/lib/money";

export interface StepGiftAidValue {
  enabled: boolean;
  confirmations: GiftAidConfirmations;
}

export const EMPTY_GIFT_AID_VALUE: StepGiftAidValue = {
  enabled: false,
  confirmations: EMPTY_GIFT_AID_CONFIRMATIONS,
};

interface Props {
  amountPence: number;
  value: StepGiftAidValue;
  onChange: (value: StepGiftAidValue) => void;
}

const DECLARATIONS = [
  {
    key: "ukTaxpayer",
    label:
      "I am a UK taxpayer and understand that if I pay less Income Tax and/or Capital Gains Tax than the amount of Gift Aid claimed on all my donations in the relevant tax year, it is my responsibility to pay any difference.",
  },
  {
    key: "ownMoney",
    label:
      "This is my own money. I am not paying in donations made by a third party.",
  },
  {
    key: "noBenefit",
    label:
      "This donation is not made as part of a sweepstake, raffle or lottery (e.g. book, auction prize, ticket to an event) and I am not receiving anything in return for it.",
  },
] as const;

export function StepGiftAid({ amountPence, value, onChange }: Props) {
  const uplift = calculateGiftAidUpliftPence(amountPence);
  const total = amountPence + uplift;
  const enabledIncomplete =
    value.enabled && !isGiftAidValid(value.confirmations);

  const toggle = (next: boolean) => {
    onChange({
      enabled: next,
      confirmations: next ? value.confirmations : EMPTY_GIFT_AID_CONFIRMATIONS,
    });
  };

  const setConfirmation = (key: keyof GiftAidConfirmations, next: boolean) => {
    onChange({
      enabled: value.enabled,
      confirmations: { ...value.confirmations, [key]: next },
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <label className="ring-bwf-blue/30 flex items-start gap-3 rounded-xl bg-white/5 p-4 ring-1">
        <input
          type="checkbox"
          checked={value.enabled}
          onChange={(e) => toggle(e.target.checked)}
          aria-label="Add Gift Aid to my donation"
          className="mt-1"
        />
        <span className="flex-1">
          <span className="block text-base font-semibold">
            I would like to add Gift Aid to my donation
          </span>
          <span className="mt-1 block text-sm text-white/70">
            Boost your donation by 25% at no extra cost. We can only claim this
            if you&apos;re a UK taxpayer.
          </span>
        </span>
      </label>

      {value.enabled ? (
        <>
          <div
            role="group"
            aria-label="Gift Aid uplift summary"
            className="bg-bwf-blue/15 ring-bwf-blue/40 grid grid-cols-[1fr_auto_1fr] items-center gap-4 rounded-xl p-5 ring-1"
          >
            <div>
              <p className="text-xs tracking-wide text-white/60 uppercase">
                Your donation
              </p>
              <p className="text-2xl font-semibold sm:text-3xl">
                {formatGbpPence(amountPence)}
              </p>
            </div>
            <span aria-hidden className="text-2xl text-white/60">
              →
            </span>
            <div>
              <p className="text-xs tracking-wide text-white/60 uppercase">
                With Gift Aid
              </p>
              <p className="text-2xl font-semibold sm:text-3xl">
                {formatGbpPence(total)}
              </p>
              <p className="mt-1 text-xs text-white/60">
                Boost your donation at no extra cost.
              </p>
            </div>
          </div>

          <fieldset className="flex flex-col gap-3">
            <legend className="sr-only">Gift Aid declarations</legend>
            {DECLARATIONS.map(({ key, label }) => (
              <label
                key={key}
                className="flex items-start gap-3 rounded-lg bg-white/5 p-3 text-sm"
              >
                <input
                  type="checkbox"
                  checked={value.confirmations[key]}
                  onChange={(e) => setConfirmation(key, e.target.checked)}
                  aria-label={label}
                  className="mt-1"
                />
                <span className="text-white/85">{label}</span>
              </label>
            ))}
          </fieldset>

          {enabledIncomplete ? (
            <p role="alert" className="text-sm text-amber-300">
              All three declarations must be confirmed before continuing with
              Gift Aid.
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
