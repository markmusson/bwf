// Pure scene builder for the Open Graph share image at
// /seat/<slug>/opengraph-image. Keeping the data shaping separate
// from the ImageResponse JSX so we can unit-test the strings without
// dragging in next/og at vitest time.

import { STANDS } from "./stands";

export interface OgSceneInput {
  slug: string;
  donors: number;
  raisedPence: number;
  // Optional: the lead tribute (newest) used as the headline donor.
  // null when no approved tribute exists yet.
  lead: {
    displayName: string | null;
    amountPence: number | null;
    giftAid: boolean;
    text: string;
  } | null;
}

export interface OgScene {
  // Stand display name for the eyebrow line, e.g. "Eric Hollies Stand".
  standName: string;
  // Row + seat label, e.g. "Row 3, Seat 12".
  seatLabel: string;
  // Headline copy: "A seat turned blue for Bob" by default, or
  // "<name>'s seat at Edgbaston" when we have a non-anonymous donor.
  headline: string;
  // Single-line summary: "2 donors · £75 raised on this seat" or, for
  // an unclaimed seat, "This seat is unclaimed — £25 minimum."
  summary: string;
  // Optional tribute snippet (truncated to ~120 chars to fit the OG
  // image proportions). null when there's no approved tribute.
  tributeSnippet: string | null;
  // The seat's tier price label ("£10" / "£25" / "£50").
  tierPrice: string;
}

const TRIBUTE_MAX = 120;

function describeStand(standId: string): string {
  return STANDS.find((s) => s.id === standId)?.name ?? standId;
}

function tierPriceFor(standId: string): string {
  const stand = STANDS.find((s) => s.id === standId);
  const pence = stand?.pricePence ?? 1000;
  return `£${Math.round(pence / 100)}`;
}

function formatGBP(pence: number): string {
  const pounds = pence / 100;
  return pounds % 1 === 0 ? `£${pounds.toFixed(0)}` : `£${pounds.toFixed(2)}`;
}

function truncate(text: string, max = TRIBUTE_MAX): string {
  if (text.length <= max) return text;
  // Snip on the last whitespace within the limit so we don't break a
  // word; fall back to a hard cut when the whole 120 chars are one
  // long token.
  const slice = text.slice(0, max - 1);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace > 40 ? lastSpace : slice.length;
  return `${slice.slice(0, cut).trimEnd()}…`;
}

export function buildOgScene(input: OgSceneInput): OgScene {
  // Slug is "<stand>-<row1>-<num1>". We rebuild the seat label from
  // the slug rather than re-fetching so the helper stays pure.
  const [stand = "", rowStr = "0", numStr = "0"] = input.slug.split("-");
  const standName = describeStand(stand);
  const tierPrice = tierPriceFor(stand);
  const seatLabel = `Row ${rowStr}, Seat ${numStr}`;

  if (input.donors === 0 || !input.lead) {
    return {
      standName,
      seatLabel,
      headline:
        input.donors === 0
          ? "This seat is unclaimed"
          : "A seat turned blue for Bob",
      summary:
        input.donors === 0
          ? `${tierPrice} minimum donation — turn it blue.`
          : `${input.donors === 1 ? "1 donor" : `${input.donors} donors`} · ${formatGBP(input.raisedPence)} raised`,
      tributeSnippet: null,
      tierPrice,
    };
  }

  const headline =
    input.lead.displayName !== null
      ? `${input.lead.displayName}'s seat at Edgbaston`
      : "An anonymous tribute at Edgbaston";

  const donorLine = input.donors === 1 ? "1 donor" : `${input.donors} donors`;
  const raisedLine = `${formatGBP(input.raisedPence)} raised`;
  const summary = `${donorLine} · ${raisedLine}`;

  return {
    standName,
    seatLabel,
    headline,
    summary,
    tributeSnippet: truncate(input.lead.text),
    tierPrice,
  };
}

// Re-exported only so tests can poke the constants without importing
// from a private path.
export const OG_TRIBUTE_MAX = TRIBUTE_MAX;

// Surface for the route handler — what does the image's <title>
// metadata read?  Keeps the alt text aligned with the visible copy.
export function buildOgAltText(scene: OgScene): string {
  return `${scene.headline}. ${scene.standName}, ${scene.seatLabel}. ${scene.summary}.`;
}

// Avoid an unused variable warning when displayName ?? "Anonymous" is
// only consumed in a future sub-component; export the helper too.
export function nameOrAnonymous(displayName: string | null): string {
  return displayName ?? "Anonymous";
}
