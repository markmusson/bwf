"use client";

import { useState } from "react";
import {
  MIN_DONATION_PENCE,
  poundsToPence,
  SUGGESTED_AMOUNTS_PENCE,
  validateAmountPence,
} from "@/lib/donation/amount";
import { formatGbpPence } from "@/lib/money";

interface Props {
  value: number;
  onChange: (amountPence: number) => void;
}

export function StepAmount({ value, onChange }: Props) {
  const isPreset = (SUGGESTED_AMOUNTS_PENCE as readonly number[]).includes(
    value,
  );
  const [customMode, setCustomMode] = useState(!isPreset);
  const [customInput, setCustomInput] = useState(
    isPreset ? "" : (value / 100).toString(),
  );
  const [customError, setCustomError] = useState<string | null>(null);

  const pickPreset = (amountPence: number) => {
    setCustomMode(false);
    setCustomError(null);
    onChange(amountPence);
  };

  const handleCustomChange = (raw: string) => {
    setCustomInput(raw);
    if (!raw) {
      setCustomError(null);
      return;
    }
    const pounds = Number(raw);
    if (Number.isNaN(pounds)) {
      setCustomError("Enter a number.");
      return;
    }
    const pence = poundsToPence(pounds);
    const result = validateAmountPence(pence);
    if (!result.ok) {
      setCustomError(
        result.reason === "below_minimum"
          ? `The minimum is ${formatGbpPence(MIN_DONATION_PENCE)}.`
          : "Enter a valid amount.",
      );
      return;
    }
    setCustomError(null);
    onChange(pence);
  };

  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="text-base font-semibold">
        How much would you like to donate?
      </legend>
      <p className="text-sm text-white/70">
        £10 buys you a virtual seat. Anything more goes straight to the Bob
        Willis Fund.
      </p>

      <div
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
        role="radiogroup"
        aria-label="Donation amount"
      >
        {SUGGESTED_AMOUNTS_PENCE.map((amountPence) => {
          const checked = !customMode && value === amountPence;
          return (
            <label
              key={amountPence}
              className={[
                "flex cursor-pointer items-center justify-center rounded-xl px-4 py-3 text-base font-semibold ring-1 transition-colors",
                checked
                  ? "bg-bwf-blue ring-bwf-blue text-white"
                  : "ring-bwf-blue/30 bg-white/5 text-white/80 hover:bg-white/10",
              ].join(" ")}
            >
              <input
                type="radio"
                name="donation-amount"
                value={amountPence}
                checked={checked}
                onChange={() => pickPreset(amountPence)}
                className="sr-only"
              />
              {formatGbpPence(amountPence)}
            </label>
          );
        })}

        <label
          className={[
            "flex cursor-pointer items-center justify-center rounded-xl px-4 py-3 text-base font-semibold ring-1 transition-colors",
            customMode
              ? "bg-bwf-blue ring-bwf-blue text-white"
              : "ring-bwf-blue/30 bg-white/5 text-white/80 hover:bg-white/10",
          ].join(" ")}
        >
          <input
            type="radio"
            name="donation-amount"
            value="custom"
            checked={customMode}
            onChange={() => {
              setCustomMode(true);
              setCustomError(null);
              if (customInput) handleCustomChange(customInput);
            }}
            className="sr-only"
          />
          Other
        </label>
      </div>

      {customMode ? (
        <div className="flex flex-col gap-1">
          <label className="text-sm text-white/70" htmlFor="custom-amount">
            Custom amount in £
          </label>
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold">£</span>
            <input
              id="custom-amount"
              type="number"
              inputMode="decimal"
              min="10"
              step="0.01"
              value={customInput}
              onChange={(event) => handleCustomChange(event.target.value)}
              placeholder="25"
              className="ring-bwf-blue/40 w-32 rounded-lg bg-white/10 px-3 py-2 text-base ring-1 outline-none focus:ring-2"
              aria-invalid={customError !== null}
              aria-describedby={customError ? "custom-amount-error" : undefined}
            />
          </div>
          {customError ? (
            <p
              id="custom-amount-error"
              role="alert"
              className="text-sm text-amber-300"
            >
              {customError}
            </p>
          ) : null}
        </div>
      ) : null}

      <p className="text-bwf-pale text-sm">
        Selected:{" "}
        <strong data-testid="amount-readout">{formatGbpPence(value)}</strong>
      </p>
    </fieldset>
  );
}
