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

  test("available seat returns 0 donors, empty tributes, empty raised", async () => {
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
    expect(result?.seat).toMatchObject({
      stand: "wyatt",
      row: 2,
      num: 4,
      status: "available",
      slug: "wyatt-3-5",
    });
    expect(result?.donors).toBe(0);
    expect(result?.raisedPence).toBe(0);
    expect(result?.tributes).toEqual([]);
  });

  test("seat with two paid donations + two approved tributes returns both, newest first", async () => {
    const t = convexTest(schema, modules);
    const { seatId } = await t.run(async (ctx) => {
      const seatId = await ctx.db.insert("seats", {
        stand: "hollies",
        row: 1,
        num: 7,
        status: "taken" as const,
        claimedCount: 2,
      });
      const userA = await ctx.db.insert("users", {});
      const userB = await ctx.db.insert("users", {});
      const donA = await ctx.db.insert("donations", {
        userId: userA,
        seatId,
        amountPence: 2500,
        currency: "GBP" as const,
        giftAid: true,
        hideName: false,
        hideAmount: false,
        displayName: "Sarah W.",
        stripeSessionId: "cs_a",
        status: "paid" as const,
      });
      const donB = await ctx.db.insert("donations", {
        userId: userB,
        seatId,
        amountPence: 5000,
        currency: "GBP" as const,
        giftAid: false,
        hideName: false,
        hideAmount: false,
        displayName: "John D.",
        stripeSessionId: "cs_b",
        status: "paid" as const,
      });
      await ctx.db.insert("tributes", {
        donationId: donA,
        text: "For my dad.",
        status: "approved" as const,
      });
      await ctx.db.insert("tributes", {
        donationId: donB,
        text: "Bob was a hero.",
        status: "approved" as const,
      });
      return { seatId };
    });
    const result = await t.query(api.seats.getCard, { seatId });
    expect(result?.donors).toBe(2);
    expect(result?.raisedPence).toBe(7500);
    expect(result?.tributes).toHaveLength(2);
    // Newest first — donB inserted later so its createdAt > donA.
    expect(result?.tributes[0]?.text).toBe("Bob was a hero.");
    expect(result?.tributes[1]?.text).toBe("For my dad.");
  });

  test("hideName masks the donor's display name in the tribute entry", async () => {
    const t = convexTest(schema, modules);
    const { seatId } = await t.run(async (ctx) => {
      const seatId = await ctx.db.insert("seats", {
        stand: "hollies",
        row: 0,
        num: 0,
        status: "taken" as const,
        claimedCount: 1,
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
        stripeSessionId: "cs_anon",
        status: "paid" as const,
      });
      await ctx.db.insert("tributes", {
        donationId,
        text: "anon",
        status: "approved" as const,
      });
      return { seatId };
    });
    const result = await t.query(api.seats.getCard, { seatId });
    expect(result?.tributes[0]?.displayName).toBeNull();
  });

  test("hideAmount masks the donor's amount in the tribute entry", async () => {
    const t = convexTest(schema, modules);
    const { seatId } = await t.run(async (ctx) => {
      const seatId = await ctx.db.insert("seats", {
        stand: "hollies",
        row: 0,
        num: 0,
        status: "taken" as const,
        claimedCount: 1,
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
        stripeSessionId: "cs_hide",
        status: "paid" as const,
      });
      await ctx.db.insert("tributes", {
        donationId,
        text: "shy",
        status: "approved" as const,
      });
      return { seatId };
    });
    const result = await t.query(api.seats.getCard, { seatId });
    expect(result?.tributes[0]?.amountPence).toBeNull();
  });

  test("pending or rejected tributes are excluded from the list", async () => {
    const t = convexTest(schema, modules);
    const { seatId } = await t.run(async (ctx) => {
      const seatId = await ctx.db.insert("seats", {
        stand: "hollies",
        row: 0,
        num: 0,
        status: "taken" as const,
        claimedCount: 1,
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
        status: "paid" as const,
      });
      await ctx.db.insert("tributes", {
        donationId,
        text: "naughty words",
        status: "pending" as const,
      });
      return { seatId };
    });
    const result = await t.query(api.seats.getCard, { seatId });
    expect(result?.tributes).toEqual([]);
    // The donation still counts toward donors / raised.
    expect(result?.donors).toBe(1);
    expect(result?.raisedPence).toBe(1000);
  });

  test("getCardBySlug returns the same shape as getCard for a valid coord", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const seatId = await ctx.db.insert("seats", {
        stand: "wyatt",
        row: 0,
        num: 4,
        status: "taken" as const,
        claimedCount: 1,
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
      await ctx.db.insert("tributes", {
        donationId,
        text: "slug round-trip",
        status: "approved" as const,
      });
    });

    const result = await t.query(api.seats.getCardBySlug, {
      slug: "wyatt-1-5",
    });
    expect(result?.seat.slug).toBe("wyatt-1-5");
    expect(result?.tributes[0]?.displayName).toBe("Sarah W.");
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
});
