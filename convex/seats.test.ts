/// <reference types="vite/client" />
// @vitest-environment edge-runtime

import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("seats.getCard", () => {
  test("returns null for an unknown seat id", async () => {
    const t = convexTest(schema, modules);
    // Insert + delete to obtain a syntactically valid but missing id.
    const ghost = await t.run((ctx) =>
      ctx.db.insert("seats", {
        stand: "hollies",
        row: 0,
        num: 0,
        status: "available" as const,
      }),
    );
    await t.run((ctx) => ctx.db.delete(ghost));
    const result = await t.query(api.seats.getCard, { seatId: ghost });
    expect(result).toBeNull();
  });

  test("available seat returns seat + null donation + null tribute", async () => {
    const t = convexTest(schema, modules);
    const seatId = await t.run((ctx) =>
      ctx.db.insert("seats", {
        stand: "wyatt",
        row: 2,
        num: 4,
        status: "available" as const,
      }),
    );
    const result = await t.query(api.seats.getCard, { seatId });
    expect(result).toEqual({
      seat: { stand: "wyatt", row: 2, num: 4, status: "available" },
      donation: null,
      tribute: null,
    });
  });

  test("taken seat with paid donation returns public donation shape + approved tribute", async () => {
    const t = convexTest(schema, modules);
    const { seatId } = await t.run(async (ctx) => {
      const seatId = await ctx.db.insert("seats", {
        stand: "hollies",
        row: 1,
        num: 7,
        status: "taken" as const,
      });
      const userId = await ctx.db.insert("users", {});
      const donationId = await ctx.db.insert("donations", {
        userId,
        seatId,
        amountPence: 2500,
        currency: "GBP" as const,
        giftAid: true,
        hideName: false,
        hideAmount: false,
        displayName: "Sarah W.",
        stripeSessionId: "cs_paid",
        status: "paid" as const,
      });
      await ctx.db.patch(seatId, { donationId });
      await ctx.db.insert("tributes", {
        donationId,
        text: "For Bob.",
        status: "approved" as const,
      });
      return { seatId };
    });
    const result = await t.query(api.seats.getCard, { seatId });
    expect(result).toEqual({
      seat: { stand: "hollies", row: 1, num: 7, status: "taken" },
      donation: {
        displayName: "Sarah W.",
        amountPence: 2500,
        giftAid: true,
      },
      tribute: { text: "For Bob." },
    });
  });

  test("hideName forces displayName to null in the public shape", async () => {
    const t = convexTest(schema, modules);
    const seatId = await t.run(async (ctx) => {
      const seatId = await ctx.db.insert("seats", {
        stand: "hollies",
        row: 0,
        num: 0,
        status: "taken" as const,
      });
      const userId = await ctx.db.insert("users", {});
      const donationId = await ctx.db.insert("donations", {
        userId,
        seatId,
        amountPence: 1000,
        currency: "GBP" as const,
        giftAid: false,
        hideName: true,
        hideAmount: false,
        displayName: "Sarah W.",
        stripeSessionId: "cs_paid_hide",
        status: "paid" as const,
      });
      await ctx.db.patch(seatId, { donationId });
      return seatId;
    });
    const result = await t.query(api.seats.getCard, { seatId });
    expect(result?.donation?.displayName).toBeNull();
  });

  test("hideAmount forces amountPence to null in the public shape", async () => {
    const t = convexTest(schema, modules);
    const seatId = await t.run(async (ctx) => {
      const seatId = await ctx.db.insert("seats", {
        stand: "hollies",
        row: 0,
        num: 0,
        status: "taken" as const,
      });
      const userId = await ctx.db.insert("users", {});
      const donationId = await ctx.db.insert("donations", {
        userId,
        seatId,
        amountPence: 9999,
        currency: "GBP" as const,
        giftAid: false,
        hideName: false,
        hideAmount: true,
        displayName: "Sarah W.",
        stripeSessionId: "cs_paid_hideamt",
        status: "paid" as const,
      });
      await ctx.db.patch(seatId, { donationId });
      return seatId;
    });
    const result = await t.query(api.seats.getCard, { seatId });
    expect(result?.donation?.amountPence).toBeNull();
  });

  test("pending or rejected tribute is not exposed publicly", async () => {
    const t = convexTest(schema, modules);
    const seatId = await t.run(async (ctx) => {
      const seatId = await ctx.db.insert("seats", {
        stand: "hollies",
        row: 0,
        num: 0,
        status: "taken" as const,
      });
      const userId = await ctx.db.insert("users", {});
      const donationId = await ctx.db.insert("donations", {
        userId,
        seatId,
        amountPence: 1000,
        currency: "GBP" as const,
        giftAid: false,
        hideName: false,
        hideAmount: false,
        stripeSessionId: "cs_paid_nopub",
        status: "paid" as const,
      });
      await ctx.db.patch(seatId, { donationId });
      await ctx.db.insert("tributes", {
        donationId,
        text: "naughty words",
        status: "pending" as const,
      });
      return seatId;
    });
    const result = await t.query(api.seats.getCard, { seatId });
    expect(result?.tribute).toBeNull();
  });

  test("getCardBySlug returns the same shape as getCard for a valid coord", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const seatId = await ctx.db.insert("seats", {
        stand: "wyatt",
        row: 0,
        num: 4,
        status: "taken" as const,
      });
      const userId = await ctx.db.insert("users", {});
      const donationId = await ctx.db.insert("donations", {
        userId,
        seatId,
        amountPence: 1500,
        currency: "GBP" as const,
        giftAid: false,
        hideName: false,
        hideAmount: false,
        displayName: "Sarah W.",
        stripeSessionId: "cs_slug",
        status: "paid" as const,
      });
      await ctx.db.patch(seatId, { donationId });
    });

    const result = await t.query(api.seats.getCardBySlug, {
      slug: "wyatt-1-5",
    });
    expect(result?.seat).toEqual({
      stand: "wyatt",
      row: 0,
      num: 4,
      status: "taken",
    });
    expect(result?.donation?.displayName).toBe("Sarah W.");
  });

  test("getCardBySlug returns null for a malformed slug", async () => {
    const t = convexTest(schema, modules);
    expect(await t.query(api.seats.getCardBySlug, { slug: "24" })).toBeNull();
    expect(
      await t.query(api.seats.getCardBySlug, { slug: "nope-1-1" }),
    ).toBeNull();
  });

  test("getCardBySlug returns null for an unseeded coord", async () => {
    const t = convexTest(schema, modules);
    expect(
      await t.query(api.seats.getCardBySlug, { slug: "hollies-99-99" }),
    ).toBeNull();
  });

  test("seat marked taken but donation pending (race) returns donation:null", async () => {
    const t = convexTest(schema, modules);
    const seatId = await t.run(async (ctx) => {
      const seatId = await ctx.db.insert("seats", {
        stand: "hollies",
        row: 0,
        num: 0,
        status: "taken" as const,
      });
      const userId = await ctx.db.insert("users", {});
      const donationId = await ctx.db.insert("donations", {
        userId,
        seatId,
        amountPence: 1000,
        currency: "GBP" as const,
        giftAid: false,
        hideName: false,
        hideAmount: false,
        stripeSessionId: "cs_pending",
        status: "pending" as const,
      });
      await ctx.db.patch(seatId, { donationId });
      return seatId;
    });
    const result = await t.query(api.seats.getCard, { seatId });
    expect(result?.donation).toBeNull();
  });
});
