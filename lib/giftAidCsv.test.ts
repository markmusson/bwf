import { describe, expect, it } from "vitest";
import {
  escapeCsvField,
  formatGiftAidCsv,
  giftAidUplift,
  GIFT_AID_CSV_HEADER,
  type GiftAidRow,
} from "./giftAidCsv";

describe("escapeCsvField", () => {
  it("returns the field unchanged when it has no special chars", () => {
    expect(escapeCsvField("Sarah W.")).toBe("Sarah W.");
  });

  it("wraps fields with commas in double quotes", () => {
    expect(escapeCsvField("Smith, Sarah")).toBe('"Smith, Sarah"');
  });

  it("escapes embedded quotes by doubling them", () => {
    expect(escapeCsvField('She said "hi"')).toBe('"She said ""hi"""');
  });

  it("wraps fields with newlines in double quotes", () => {
    expect(escapeCsvField("line1\nline2")).toBe('"line1\nline2"');
  });
});

describe("giftAidUplift", () => {
  it("returns 0 when giftAid is false", () => {
    expect(giftAidUplift(1000, false)).toBe(0);
  });

  it("returns 25% of the donation when giftAid is true", () => {
    expect(giftAidUplift(1000, true)).toBe(250);
    expect(giftAidUplift(2500, true)).toBe(625);
  });

  it("floors fractional pence (e.g. £0.05 -> 1p uplift)", () => {
    expect(giftAidUplift(5, true)).toBe(1);
  });
});

describe("formatGiftAidCsv", () => {
  const rows: GiftAidRow[] = [
    {
      donationDate: "2026-04-29",
      email: "donor@example.com",
      displayName: "Sarah W.",
      amountPence: 2500,
      upliftPence: 625,
      stripePaymentIntentId: "pi_abc",
    },
    {
      donationDate: "2026-04-30",
      email: null,
      displayName: null,
      amountPence: 1000,
      upliftPence: 250,
      stripePaymentIntentId: null,
    },
  ];

  it("emits the locked HMRC-style header on the first row", () => {
    const csv = formatGiftAidCsv(rows);
    expect(csv.split("\n")[0]).toBe(GIFT_AID_CSV_HEADER.join(","));
  });

  it("renders pence as 2dp GBP", () => {
    const csv = formatGiftAidCsv(rows);
    const lines = csv.split("\n");
    expect(lines[1]).toContain("25.00");
    expect(lines[1]).toContain("6.25");
  });

  it("emits empty cells for null email / display name / payment intent", () => {
    const csv = formatGiftAidCsv(rows);
    const lines = csv.split("\n");
    expect(lines[2]).toBe("2026-04-30,,,10.00,2.50,");
  });

  it("escapes display names that contain commas", () => {
    const csv = formatGiftAidCsv([
      {
        donationDate: "2026-04-29",
        email: "donor@example.com",
        displayName: "Smith, Sarah",
        amountPence: 1000,
        upliftPence: 250,
        stripePaymentIntentId: "pi_x",
      },
    ]);
    expect(csv).toContain('"Smith, Sarah"');
  });

  it("returns just the header for an empty input", () => {
    expect(formatGiftAidCsv([])).toBe(GIFT_AID_CSV_HEADER.join(","));
  });
});
