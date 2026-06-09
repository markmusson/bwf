import { describe, expect, it } from "vitest";
import { formatReceipt } from "./receipt";

const BASE_DONATION = {
  amountPence: 2500,
  giftAid: false,
  hideName: false,
  displayName: "Sarah Williams",
};

describe("formatReceipt", () => {
  it("greets the donor by name when one is supplied", () => {
    const out = formatReceipt(BASE_DONATION, {
      email: "donor@example.com",
      name: "Sarah Williams",
    });
    expect(out.html).toContain("Dear Sarah Williams");
    expect(out.text).toContain("Hello Sarah Williams");
  });

  it("falls back to Hello when no name is supplied", () => {
    const out = formatReceipt(BASE_DONATION, { email: "donor@example.com" });
    expect(out.html).toContain("Hello,");
    expect(out.text).toMatch(/^Hello,/);
  });

  it("renders the donation amount with no Gift Aid block when off", () => {
    const out = formatReceipt(BASE_DONATION, { email: "donor@example.com" });
    expect(out.html).toContain("£25.00");
    expect(out.html).not.toContain("Gift Aid uplift");
    expect(out.text).not.toContain("Gift Aid uplift");
  });

  it("includes the £6.25 uplift on a £25 Gift Aid donation", () => {
    const out = formatReceipt(
      {
        ...BASE_DONATION,
        giftAid: true,
        giftAidConfirmations: { declaredAt: 0 },
      },
      { email: "donor@example.com" },
    );
    expect(out.html).toContain("Gift Aid uplift");
    expect(out.html).toContain("£6.25");
    expect(out.html).toContain("£31.25");
  });

  it("uses Anonymous on the seat line when hideName is true", () => {
    const out = formatReceipt(
      { ...BASE_DONATION, hideName: true },
      { email: "donor@example.com" },
    );
    expect(out.html).toContain("Anonymous");
    expect(out.html).not.toContain("Sarah Williams");
  });

  it("escapes HTML in the donor's name", () => {
    const out = formatReceipt(BASE_DONATION, {
      email: "donor@example.com",
      name: "<script>alert('x')</script>",
    });
    expect(out.html).not.toContain("<script>");
    expect(out.html).toContain("&lt;script&gt;");
  });

  it("includes the locked charity number 1185346 in the footer", () => {
    const out = formatReceipt(BASE_DONATION, { email: "donor@example.com" });
    expect(out.html).toContain("1185346");
    expect(out.text).toContain("1185346");
  });

  it("does NOT mention the prize draw until the prize is confirmed", () => {
    // Adam asked (1 Jun) to remove prize-draw wording from the receipt
    // until the prize element is locked. Page itself stays live; copy
    // is hidden. Re-enable by reinstating the prize-draw paragraph in
    // formatReceipt + this assertion.
    const out = formatReceipt(BASE_DONATION, { email: "donor@example.com" });
    expect(out.html).not.toMatch(/prize draw/i);
    expect(out.text).not.toMatch(/prize draw/i);
  });

  describe("share image embed", () => {
    it("renders the share image at the top when shareImageUrl is provided", () => {
      const out = formatReceipt(
        BASE_DONATION,
        { email: "donor@example.com" },
        {
          shareImageUrl:
            "https://blue.bobwillisfund.org/seat/wyatt-1-4/opengraph-image",
        },
      );
      expect(out.html).toContain(
        'src="https://blue.bobwillisfund.org/seat/wyatt-1-4/opengraph-image"',
      );
      // Image should sit above the receipt body so the dedication is
      // the first thing the donor sees.
      expect(out.html.indexOf("<img")).toBeLessThan(
        out.html.indexOf("Thank you for taking your Blue Seat"),
      );
    });

    it("omits the image when shareImageUrl is not provided", () => {
      const out = formatReceipt(BASE_DONATION, { email: "donor@example.com" });
      expect(out.html).not.toContain("<img");
    });

    it("escapes the share image URL", () => {
      const out = formatReceipt(
        BASE_DONATION,
        { email: "donor@example.com" },
        {
          shareImageUrl:
            'https://evil.example.com/x"><script>alert(1)</script>',
        },
      );
      expect(out.html).not.toContain("<script>alert");
      expect(out.html).toContain("&quot;");
    });
  });

  describe("share-this-seat section (Adam, 9 Jun)", () => {
    const seatShareUrl = "https://seats.bobwillisfund.org/seat/wyatt-1-4";

    it("renders the 'Help Us Fill More Seats' heading + copy when seatShareUrl is set", () => {
      const out = formatReceipt(BASE_DONATION, { email: "d@e.com" }, { seatShareUrl });
      expect(out.html).toContain("Help Us Fill More Seats");
      expect(out.html).toContain("final Blue for Bob campaign");
      expect(out.text).toContain("Help Us Fill More Seats");
    });

    it("renders share intent links for X, LinkedIn, Facebook, WhatsApp", () => {
      const out = formatReceipt(BASE_DONATION, { email: "d@e.com" }, { seatShareUrl });
      expect(out.html).toMatch(/href="https:\/\/twitter\.com\/intent\/tweet[^"]*"/);
      expect(out.html).toMatch(/href="https:\/\/www\.linkedin\.com\/sharing\/share-offsite[^"]*"/);
      expect(out.html).toMatch(/href="https:\/\/www\.facebook\.com\/sharer[^"]*"/);
      expect(out.html).toMatch(/href="https:\/\/wa\.me\/[^"]*"/);
    });

    it("each share link includes the donor's seat URL", () => {
      const out = formatReceipt(BASE_DONATION, { email: "d@e.com" }, { seatShareUrl });
      const expected = encodeURIComponent(seatShareUrl);
      const altExpected = seatShareUrl.replace(/:/g, "%3A").replace(/\//g, "%2F");
      // URLSearchParams may use either + or %20 for spaces but the URL
      // itself should round-trip cleanly inside the href.
      expect(
        out.html.includes(expected) || out.html.includes(altExpected),
      ).toBe(true);
    });

    it("section sits between the thank-you copy and the donation table", () => {
      const out = formatReceipt(BASE_DONATION, { email: "d@e.com" }, { seatShareUrl });
      const thankYouAt = out.html.indexOf(
        "Your Blue Seat has been secured",
      );
      const shareHeadingAt = out.html.indexOf("Help Us Fill More Seats");
      const donationLineAt = out.html.indexOf("Donation:");
      expect(thankYouAt).toBeGreaterThan(-1);
      expect(shareHeadingAt).toBeGreaterThan(thankYouAt);
      expect(donationLineAt).toBeGreaterThan(shareHeadingAt);
    });

    it("omits the section entirely when no seatShareUrl is supplied", () => {
      const out = formatReceipt(BASE_DONATION, { email: "d@e.com" });
      expect(out.html).not.toContain("Help Us Fill More Seats");
      expect(out.text).not.toContain("Help Us Fill More Seats");
    });
  });
});
