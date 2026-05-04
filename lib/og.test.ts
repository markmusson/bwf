import { describe, expect, it } from "vitest";
import {
  buildOgAltText,
  buildOgScene,
  nameOrAnonymous,
  OG_TRIBUTE_MAX,
} from "./og";

describe("buildOgScene", () => {
  it("renders the unclaimed-seat scene with the flat £10 minimum", () => {
    const scene = buildOgScene({
      slug: "south-3-12",
      donors: 0,
      raisedPence: 0,
      lead: null,
    });
    expect(scene.standName).toBe("Pavilion (South Stand)");
    expect(scene.seatLabel).toBe("Row 3, Seat 12");
    expect(scene.headline).toBe("This seat is unclaimed");
    expect(scene.summary).toMatch(/£10 minimum/);
    expect(scene.tributeSnippet).toBeNull();
    expect(scene.tierPrice).toBe("£10");
  });

  it("renders the donor headline for a single-donor seat with a name", () => {
    const scene = buildOgScene({
      slug: "hollies-3-12",
      donors: 1,
      raisedPence: 2_500,
      lead: {
        displayName: "Sarah W.",
        amountPence: 2_500,
        giftAid: true,
        text: "For my dad — Bob's legacy lives on.",
      },
    });
    expect(scene.headline).toBe("Sarah W.'s seat at Edgbaston");
    expect(scene.summary).toBe("1 donor · £25 raised");
    expect(scene.tributeSnippet).toBe("For my dad — Bob's legacy lives on.");
  });

  it("renders an anonymous headline when the donor opted out of name", () => {
    const scene = buildOgScene({
      slug: "wyatt-1-5",
      donors: 1,
      raisedPence: 1_000,
      lead: {
        displayName: null,
        amountPence: 1_000,
        giftAid: false,
        text: "Best fast bowler England ever produced.",
      },
    });
    expect(scene.headline).toBe("An anonymous tribute at Edgbaston");
  });

  it("counts donors > 1 in the summary", () => {
    const scene = buildOgScene({
      slug: "hollies-1-1",
      donors: 4,
      raisedPence: 12_500,
      lead: {
        displayName: "John D.",
        amountPence: 5_000,
        giftAid: false,
        text: "Bob was a hero.",
      },
    });
    expect(scene.summary).toBe("4 donors · £125 raised");
  });

  it("truncates a long tribute on a word boundary with an ellipsis", () => {
    const long =
      "Bob Willis was the heart of England's bowling attack in the 1970s and 1980s, taking 325 Test wickets and inspiring a generation of fast bowlers across the country with his commitment, energy and grit on every pitch.";
    const scene = buildOgScene({
      slug: "hollies-1-1",
      donors: 1,
      raisedPence: 2_500,
      lead: {
        displayName: "John D.",
        amountPence: 2_500,
        giftAid: false,
        text: long,
      },
    });
    expect(scene.tributeSnippet).not.toBeNull();
    expect(scene.tributeSnippet!.length).toBeLessThanOrEqual(OG_TRIBUTE_MAX);
    expect(scene.tributeSnippet!.endsWith("…")).toBe(true);
    // Doesn't truncate mid-word: the char before … shouldn't be a letter
    // followed by a partial token.
    expect(scene.tributeSnippet).toMatch(/\s\S+\.{0,1}…$|, …$|… ?$/);
  });

  it("falls back to the raw stand id for an unknown stand", () => {
    const scene = buildOgScene({
      slug: "unknownstand-1-1",
      donors: 0,
      raisedPence: 0,
      lead: null,
    });
    expect(scene.standName).toBe("unknownstand");
  });
});

describe("buildOgAltText", () => {
  it("composes alt text from the visible scene copy", () => {
    const scene = buildOgScene({
      slug: "hollies-3-12",
      donors: 2,
      raisedPence: 5_000,
      lead: {
        displayName: "Sarah W.",
        amountPence: 2_500,
        giftAid: false,
        text: "For Bob.",
      },
    });
    expect(buildOgAltText(scene)).toBe(
      "Sarah W.'s seat at Edgbaston. Eric Hollies Stand, Row 3, Seat 12. 2 donors · £50 raised.",
    );
  });
});

describe("nameOrAnonymous", () => {
  it("returns the name as-is when present", () => {
    expect(nameOrAnonymous("Sarah W.")).toBe("Sarah W.");
  });
  it("returns 'Anonymous' for null", () => {
    expect(nameOrAnonymous(null)).toBe("Anonymous");
  });
});
