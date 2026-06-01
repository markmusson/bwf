import { describe, expect, it } from "vitest";
import { buildSeatShareScene, SEAT_SHARE_LIMITS } from "./seatShare";

const baseInput = {
  slug: "wyatt-1-4",
  donors: 0,
  raisedPence: 0,
  lead: null,
  siteUrl: "https://blue.bobwillisfund.org",
};

describe("buildSeatShareScene", () => {
  describe("unclaimed seat", () => {
    it("eyebrow reads from the slug", () => {
      const scene = buildSeatShareScene(baseInput);
      expect(scene.standName).toBe("R.E.S. Wyatt Stand");
      expect(scene.seatLabel).toBe("Row 1, Seat 4");
    });

    it("uses the invitation sky title", () => {
      const scene = buildSeatShareScene(baseInput);
      expect(scene.skyTitle).toBe("TURN THIS SEAT BLUE FOR BOB");
    });

    it("uses the default invitation script line", () => {
      const scene = buildSeatShareScene(baseInput);
      expect(scene.skyMessage).toBe("a tribute waits to be written");
    });

    it("renders an empty plaque so the template's brass plate reads as available", () => {
      const scene = buildSeatShareScene(baseInput);
      expect(scene.plaqueName).toBe("");
      expect(scene.isClaimed).toBe(false);
    });

    it("plaque subtitle invites a dedication", () => {
      const scene = buildSeatShareScene(baseInput);
      expect(scene.plaqueSubtitle).toBe("YOUR TRIBUTE COULD GO HERE");
    });
  });

  describe("claimed but no approved tribute", () => {
    // Happens when a donor pays but hasn't (yet) written a tribute,
    // or their tribute is pending moderation. The seat is still
    // claimed and should NOT show as available.
    const input = {
      ...baseInput,
      donors: 1,
      raisedPence: 1000,
      lead: null,
    };

    it("marks the seat as claimed even without a tribute", () => {
      const scene = buildSeatShareScene(input);
      expect(scene.isClaimed).toBe(true);
      expect(scene.skyTitle).toBe("THIS SEAT IS DEDICATED TO");
    });

    it("falls back to BOB on the plaque per Adam's hierarchy", () => {
      const scene = buildSeatShareScene(input);
      expect(scene.plaqueName).toBe("BOB");
    });

    it("uses the default sky message", () => {
      const scene = buildSeatShareScene(input);
      expect(scene.skyMessage).toBe("a tribute to a life well lived");
    });
  });

  describe("Adam's name hierarchy", () => {
    // 1. recipientName (full) → use as-is on the plaque
    // 2. recipientName (first only) → use as-is (we don't second-guess)
    // 3. no recipientName → donor's FIRST name only
    // 4. no donor either → "Bob"
    it("uses the recipient name when provided (full)", () => {
      const scene = buildSeatShareScene({
        ...baseInput,
        donors: 1,
        raisedPence: 1000,
        lead: {
          displayName: "Sarah Williams",
          text: "for my dad",
          recipientName: "Ricky Moore",
        },
      });
      expect(scene.plaqueName).toBe("RICKY MOORE");
    });

    it("uses the recipient name when provided as a first-name only", () => {
      const scene = buildSeatShareScene({
        ...baseInput,
        donors: 1,
        raisedPence: 1000,
        lead: {
          displayName: "Sarah Williams",
          text: "for my dad",
          recipientName: "Ricky",
        },
      });
      expect(scene.plaqueName).toBe("RICKY");
    });

    it("falls back to the donor's FIRST name when no recipient is set", () => {
      const scene = buildSeatShareScene({
        ...baseInput,
        donors: 1,
        raisedPence: 1000,
        lead: { displayName: "Sarah Williams", text: "in memory" },
      });
      expect(scene.plaqueName).toBe("SARAH");
    });

    it("falls back to BOB when no recipient and no donor name", () => {
      const scene = buildSeatShareScene({
        ...baseInput,
        donors: 1,
        raisedPence: 1000,
        lead: { displayName: null, text: "love" },
      });
      expect(scene.plaqueName).toBe("BOB");
    });

    it("falls back to BOB when claimed without a tribute (no donor name source)", () => {
      const scene = buildSeatShareScene({
        ...baseInput,
        donors: 1,
        raisedPence: 1000,
        lead: null,
      });
      expect(scene.plaqueName).toBe("BOB");
    });
  });

  describe("anonymous donor", () => {
    const input = {
      ...baseInput,
      donors: 1,
      raisedPence: 1000,
      lead: { displayName: null, text: "for my dad" },
    };

    it("falls back to BOB on the plaque (hierarchy step 4)", () => {
      const scene = buildSeatShareScene(input);
      expect(scene.plaqueName).toBe("BOB");
    });

    it("still shows the tribute body when the name is hidden", () => {
      const scene = buildSeatShareScene(input);
      expect(scene.skyMessage).toBe("for my dad");
    });

    it("marks the seat as claimed", () => {
      const scene = buildSeatShareScene(input);
      expect(scene.isClaimed).toBe(true);
      expect(scene.skyTitle).toBe("THIS SEAT IS DEDICATED TO");
    });
  });

  describe("named donor", () => {
    const input = {
      ...baseInput,
      donors: 1,
      raisedPence: 2500,
      lead: {
        displayName: "Ricky Moore",
        text: "Always in our thoughts.",
      },
    };

    it("uppercases the donor's FIRST name on the plaque (hierarchy step 3)", () => {
      const scene = buildSeatShareScene(input);
      expect(scene.plaqueName).toBe("RICKY");
    });

    it("uses the tribute as the sky script message", () => {
      const scene = buildSeatShareScene(input);
      expect(scene.skyMessage).toBe("Always in our thoughts.");
    });

    it("uses the dedication sky title", () => {
      const scene = buildSeatShareScene(input);
      expect(scene.skyTitle).toBe("THIS SEAT IS DEDICATED TO");
    });

    it("plaque subtitle reads as a dedication", () => {
      const scene = buildSeatShareScene(input);
      expect(scene.plaqueSubtitle).toBe("IN DEDICATION");
    });

    it("falls back to a default sky message when the tribute text is empty", () => {
      const scene = buildSeatShareScene({
        ...input,
        lead: { displayName: "Ricky Moore", text: "" },
      });
      expect(scene.skyMessage).toBe("a tribute to a life well lived");
    });
  });

  describe("truncation", () => {
    it("truncates a long tribute to the configured limit", () => {
      const longText =
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";
      const scene = buildSeatShareScene({
        ...baseInput,
        donors: 1,
        raisedPence: 1000,
        lead: { displayName: "Ricky Moore", text: longText },
      });
      expect(scene.skyMessage.length).toBeLessThanOrEqual(
        SEAT_SHARE_LIMITS.skyMessage,
      );
      expect(scene.skyMessage.endsWith("…")).toBe(true);
    });

    it("truncates a long recipient name on the plaque", () => {
      const longName = "Alexandros Konstantinopoulos III the Magnificent";
      const scene = buildSeatShareScene({
        ...baseInput,
        donors: 1,
        raisedPence: 1000,
        lead: { displayName: "Sarah", text: "hi", recipientName: longName },
      });
      expect(scene.plaqueName.length).toBeLessThanOrEqual(
        SEAT_SHARE_LIMITS.plaqueName,
      );
      expect(scene.plaqueName.endsWith("…")).toBe(true);
    });
  });

  describe("CTA derived from SITE_URL", () => {
    it("strips protocol and trailing slash for the visible host", () => {
      const scene = buildSeatShareScene(baseInput);
      expect(scene.ctaHost).toBe("BLUE.BOBWILLISFUND.ORG");
    });

    it("handles a Vercel preview URL the same way", () => {
      const scene = buildSeatShareScene({
        ...baseInput,
        siteUrl: "https://bwf-seven.vercel.app/",
      });
      expect(scene.ctaHost).toBe("BWF-SEVEN.VERCEL.APP");
    });

    it("CTA copy is constant", () => {
      const scene = buildSeatShareScene(baseInput);
      expect(scene.cta).toBe("DEDICATE A SEAT TODAY");
    });
  });
});
