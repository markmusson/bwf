"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatGbpPence } from "@/lib/money";
import { STANDS } from "@/lib/stands";

interface Props {
  donationId: Id<"donations">;
  displayName: string;
  hideName: boolean;
  hideAmount: boolean;
  amountPence: number;
  giftAid: boolean;
  tributeText: string;
  tributeStatus: string | null;
  seat: { stand: string; row: number; num: number } | null;
}

const TRIBUTE_MAX_LENGTH = 280;

function describeSeat(seat: Props["seat"]): string {
  if (!seat) return "Seat pending";
  const stand = STANDS.find((s) => s.id === seat.stand);
  const standName = stand?.name ?? seat.stand;
  return `${standName} · Row ${seat.row + 1}, Seat ${seat.num + 1}`;
}

function describeStatus(status: string | null): string | null {
  if (!status) return null;
  if (status === "pending") return "Tribute being checked by moderators";
  if (status === "approved") return "Tribute on the wall";
  if (status === "rejected")
    return "Tribute rejected — please edit and resubmit";
  return status;
}

export function ManageDonationCard(props: Props) {
  const updateDonation = useMutation(api.donations.update);
  const updateTribute = useMutation(api.tributes.update);

  const [displayName, setDisplayName] = useState(props.displayName);
  const [hideName, setHideName] = useState(props.hideName);
  const [hideAmount, setHideAmount] = useState(props.hideAmount);
  const [tributeText, setTributeText] = useState(props.tributeText);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    displayName !== props.displayName ||
    hideName !== props.hideName ||
    hideAmount !== props.hideAmount ||
    tributeText !== props.tributeText;

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const donationPatch: {
        donationId: Id<"donations">;
        displayName?: string;
        hideName?: boolean;
        hideAmount?: boolean;
      } = { donationId: props.donationId };
      if (displayName !== props.displayName)
        donationPatch.displayName = displayName;
      if (hideName !== props.hideName) donationPatch.hideName = hideName;
      if (hideAmount !== props.hideAmount)
        donationPatch.hideAmount = hideAmount;
      if (Object.keys(donationPatch).length > 1) {
        await updateDonation(donationPatch);
      }
      if (tributeText !== props.tributeText && tributeText.trim().length > 0) {
        await updateTribute({
          donationId: props.donationId,
          text: tributeText,
        });
      }
      setSavedAt(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save changes");
    } finally {
      setSaving(false);
    }
  };

  const remaining = TRIBUTE_MAX_LENGTH - tributeText.length;
  const seatLabel = describeSeat(props.seat);
  const statusLabel = describeStatus(props.tributeStatus);

  return (
    <article className="bg-bwf-navy ring-bwf-blue/30 flex flex-col gap-5 rounded-2xl p-5 ring-1">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="text-bwf-pale text-xs tracking-widest uppercase">
            {seatLabel}
          </p>
          <p className="text-bwf-blue-light font-display text-xl">
            {formatGbpPence(props.amountPence)}
            {props.giftAid ? (
              <span className="ml-2 text-xs text-white/70">
                + Gift Aid uplift
              </span>
            ) : null}
          </p>
        </div>
        {statusLabel ? (
          <p className="text-xs text-white/60">{statusLabel}</p>
        ) : null}
      </header>

      <div className="flex flex-col gap-1">
        <label
          htmlFor={`display-name-${props.donationId}`}
          className="font-display text-[10px] tracking-[1.5px] text-white/60 uppercase"
        >
          Display name
        </label>
        <input
          id={`display-name-${props.donationId}`}
          type="text"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="e.g. Sarah W. — leave blank for Anonymous"
          maxLength={60}
          className="ring-bwf-blue/40 rounded-lg bg-white/10 px-3 py-2 text-base ring-1 outline-none focus:ring-2"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor={`tribute-${props.donationId}`}
          className="font-display text-[10px] tracking-[1.5px] text-white/60 uppercase"
        >
          Tribute
        </label>
        <textarea
          id={`tribute-${props.donationId}`}
          value={tributeText}
          onChange={(event) =>
            setTributeText(event.target.value.slice(0, TRIBUTE_MAX_LENGTH))
          }
          rows={4}
          placeholder="In memory of… or a few words for Bob."
          className="ring-bwf-blue/40 rounded-lg bg-white/10 px-3 py-2 text-base ring-1 outline-none focus:ring-2"
        />
        <p
          className={[
            "text-xs",
            remaining < 0 ? "text-amber-300" : "text-white/60",
          ].join(" ")}
        >
          {remaining} characters left.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={hideName}
            onChange={(event) => setHideName(event.target.checked)}
          />
          Hide my name from the wall
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={hideAmount}
            onChange={(event) => setHideAmount(event.target.checked)}
          />
          Hide my donation amount
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving || !dirty}
          className="font-display bg-bwf-blue hover:bg-bwf-blue-light rounded-full px-5 py-2.5 text-sm tracking-wider text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        {savedAt ? (
          <p className="text-xs text-white/60" data-testid="save-confirmation">
            Saved.
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-amber-300">
            {error}
          </p>
        ) : null}
      </div>
    </article>
  );
}
