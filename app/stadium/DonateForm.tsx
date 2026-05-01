"use client";

import { useState } from "react";
import { MIN_DONATION_PENCE } from "@/lib/donation/amount";
import { isGiftAidValid } from "@/lib/donation/giftAid";
import {
  isMarketingConsentAnswered,
  UNANSWERED_MARKETING_CONSENT,
  type MarketingConsent,
} from "@/lib/donation/marketingConsent";
import { MarketingConsentField } from "../donate/MarketingConsentField";
import { StepAmount } from "../donate/StepAmount";
import {
  EMPTY_GIFT_AID_VALUE,
  StepGiftAid,
  type StepGiftAidValue,
} from "../donate/StepGiftAid";
import {
  EMPTY_STEP_TRIBUTE,
  StepTribute,
  type StepTributeValue,
} from "../donate/StepTribute";

export interface DonateFormValue {
  amountPence: number;
  donorName: string;
  giftAid: StepGiftAidValue;
  tribute: StepTributeValue;
  marketing: MarketingConsent;
}

export const EMPTY_DONATE_FORM_VALUE: DonateFormValue = {
  amountPence: MIN_DONATION_PENCE,
  donorName: "",
  giftAid: EMPTY_GIFT_AID_VALUE,
  tribute: EMPTY_STEP_TRIBUTE,
  marketing: UNANSWERED_MARKETING_CONSENT,
};

interface Props {
  initial?: DonateFormValue;
  /** Per-seat minimum (defaults to the global £10 floor). */
  minimumPence?: number;
  onContinue: (value: DonateFormValue) => void;
  onCancel: () => void;
}

interface ValidationError {
  field: "donorName" | "marketing" | "giftAid";
  message: string;
}

export function validateDonateForm(value: DonateFormValue): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!value.donorName.trim()) {
    errors.push({
      field: "donorName",
      message: "Add the name to put on your seat — required for Gift Aid.",
    });
  }
  if (!isMarketingConsentAnswered(value.marketing)) {
    errors.push({
      field: "marketing",
      message: "Pick a contact preference before continuing.",
    });
  }
  if (value.giftAid.enabled && !isGiftAidValid(value.giftAid.confirmations)) {
    errors.push({
      field: "giftAid",
      message: "Tick all three Gift Aid declarations or turn Gift Aid off.",
    });
  }
  return errors;
}

export function DonateForm({
  initial,
  minimumPence,
  onContinue,
  onCancel,
}: Props) {
  const [value, setValue] = useState<DonateFormValue>(
    initial ?? EMPTY_DONATE_FORM_VALUE,
  );
  const [showErrors, setShowErrors] = useState(false);

  const errors = validateDonateForm(value);
  const errorByField = new Map(errors.map((e) => [e.field, e.message]));

  const submit = () => {
    if (errors.length > 0) {
      setShowErrors(true);
      return;
    }
    onContinue(value);
  };

  return (
    <form
      aria-label="Donation form"
      className="flex flex-col gap-8"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <StepAmount
        value={value.amountPence}
        onChange={(amountPence) => setValue({ ...value, amountPence })}
        minimumPence={minimumPence}
      />

      <div className="flex flex-col gap-2">
        <label htmlFor="donor-name" className="text-base font-semibold">
          Your name
        </label>
        <p className="text-sm text-white/70">
          We need this for the Gift Aid declaration and the seat label.
        </p>
        <input
          id="donor-name"
          type="text"
          autoComplete="name"
          value={value.donorName}
          onChange={(event) =>
            setValue({ ...value, donorName: event.target.value })
          }
          placeholder="e.g. Sarah Williams"
          className="ring-bwf-blue/40 rounded-lg bg-white/10 px-3 py-2 text-base ring-1 outline-none focus:ring-2"
          aria-invalid={
            showErrors && errorByField.has("donorName") ? true : undefined
          }
          aria-describedby={
            showErrors && errorByField.has("donorName")
              ? "donor-name-error"
              : undefined
          }
        />
        {showErrors && errorByField.has("donorName") ? (
          <p
            id="donor-name-error"
            role="alert"
            className="text-sm text-amber-300"
          >
            {errorByField.get("donorName")}
          </p>
        ) : null}
      </div>

      <StepGiftAid
        amountPence={value.amountPence}
        value={value.giftAid}
        onChange={(giftAid) => setValue({ ...value, giftAid })}
      />

      <StepTribute
        value={value.tribute}
        onChange={(tribute) => setValue({ ...value, tribute })}
      />

      <MarketingConsentField
        value={value.marketing}
        onChange={(marketing) => setValue({ ...value, marketing })}
        showError={showErrors && errorByField.has("marketing")}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="ring-bwf-blue/40 rounded-full px-5 py-2 text-sm font-medium ring-1"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="bg-bwf-blue hover:bg-bwf-accent rounded-full px-6 py-2.5 text-sm font-semibold text-white transition-colors"
        >
          Continue to payment
        </button>
      </div>
    </form>
  );
}
