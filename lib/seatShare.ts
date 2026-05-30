// Pure scene builder for the personalised photo-real share image at
// /seat/<slug>/opengraph-image. Composites onto the clean stadium
// template (public/share/stadium-template.jpg) with the donor's name
// on the brass plaque and their tribute as the sky script line.
//
// Kept separate from lib/og.ts (which still serves a stats-led variant)
// so the test surface stays narrow and the truncation rules can be
// tuned for the brass-plate dimensions specifically.

import { STANDS } from "./stands";

export interface SeatShareSceneInput {
  slug: string;
  donors: number;
  raisedPence: number;
  lead: {
    displayName: string | null;
    text: string;
  } | null;
  siteUrl: string;
}

export interface SeatShareScene {
  standName: string;
  seatLabel: string;
  isClaimed: boolean;
  skyTitle: string;
  skyMessage: string;
  plaqueName: string;
  plaqueSubtitle: string;
  cta: string;
  ctaHost: string;
}

// Limits tuned to the visible regions of the template image — the
// brass plate is narrow, the sky message sits on one italic line.
export const SEAT_SHARE_LIMITS = {
  skyMessage: 48,
  // 16 keeps any name on one line at the chosen plaque font size.
  // Real names longer than 16 chars truncate with an ellipsis.
  plaqueName: 16,
};

function describeStand(standId: string): string {
  return STANDS.find((s) => s.id === standId)?.name ?? standId;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  // Snip on the last space so we don't break a word; fall back to a
  // hard cut when the whole budget is one token.
  const slice = text.slice(0, max - 1);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace > Math.floor(max / 3) ? lastSpace : slice.length;
  return `${slice.slice(0, cut).trimEnd()}…`;
}

function ctaHostFromSiteUrl(siteUrl: string): string {
  // Strip protocol + path so the visible CTA reads as a clean host.
  // We don't use URL because the edge runtime here is fine with it
  // but the parsing failure modes for malformed input are noisier
  // than a tiny regex.
  const stripped = siteUrl
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .toUpperCase();
  return stripped;
}

export function buildSeatShareScene(
  input: SeatShareSceneInput,
): SeatShareScene {
  const [stand = "", rowStr = "0", numStr = "0"] = input.slug.split("-");
  const standName = describeStand(stand);
  const seatLabel = `Row ${rowStr}, Seat ${numStr}`;
  const ctaHost = ctaHostFromSiteUrl(input.siteUrl);
  const cta = "DEDICATE A SEAT TODAY";

  const isClaimed = input.donors > 0;

  if (!isClaimed) {
    return {
      standName,
      seatLabel,
      isClaimed: false,
      skyTitle: "TURN THIS SEAT BLUE FOR BOB",
      skyMessage: "a tribute waits to be written",
      plaqueName: "",
      plaqueSubtitle: "YOUR TRIBUTE COULD GO HERE",
      cta,
      ctaHost,
    };
  }

  // Claimed seat. The lead tribute is optional — donors can pay
  // without writing a tribute, or theirs may be pending moderation.
  // In both cases the seat is still claimed; we just fall back to a
  // gentle anonymous treatment.
  const lead = input.lead;
  const rawName =
    lead && lead.displayName !== null && lead.displayName.trim().length > 0
      ? lead.displayName.trim().toUpperCase()
      : "ANONYMOUS";
  const plaqueName = truncate(rawName, SEAT_SHARE_LIMITS.plaqueName);

  const rawMessage =
    lead && lead.text && lead.text.trim().length > 0
      ? lead.text.trim()
      : "a tribute to a life well lived";
  const skyMessage = truncate(rawMessage, SEAT_SHARE_LIMITS.skyMessage);

  return {
    standName,
    seatLabel,
    isClaimed: true,
    skyTitle: "THIS SEAT IS DEDICATED TO",
    skyMessage,
    plaqueName,
    plaqueSubtitle: "IN DEDICATION",
    cta,
    ctaHost,
  };
}
