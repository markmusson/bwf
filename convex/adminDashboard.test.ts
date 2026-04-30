/// <reference types="vite/client" />
// @vitest-environment edge-runtime

import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("admin dashboard query", () => {
  const original = process.env.ADMIN_EMAILS;

  beforeEach(() => {
    process.env.ADMIN_EMAILS = "ops@bwf.org";
  });

  afterEach(() => {
    if (original === undefined) delete process.env.ADMIN_EMAILS;
    else process.env.ADMIN_EMAILS = original;
  });

  test("rejects non-admin callers", async () => {
    const t = convexTest(schema, modules);
    const stranger = await t.run((ctx) =>
      ctx.db.insert("users", { email: "no@example.com" }),
    );
    await expect(
      t
        .withIdentity({ subject: stranger as unknown as string })
        .query(api.adminDashboard.dashboard, {}),
    ).rejects.toMatchObject({ data: "forbidden" });
  });

  test("returns counters + recent donations + recent audit log", async () => {
    const t = convexTest(schema, modules);
    const adminId = await t.run((ctx) =>
      ctx.db.insert("users", { email: "ops@bwf.org" }),
    );
    const donorId = await t.run((ctx) => ctx.db.insert("users", {}));

    await t.run(async (ctx) => {
      await ctx.db.insert("seats", {
        stand: "hollies",
        row: 0,
        num: 0,
        status: "taken" as const,
      });
      await ctx.db.insert("seats", {
        stand: "hollies",
        row: 0,
        num: 1,
        status: "available" as const,
      });

      const donationA = await ctx.db.insert("donations", {
        userId: donorId,
        amountPence: 2500,
        currency: "GBP" as const,
        giftAid: true,
        hideName: false,
        hideAmount: false,
        displayName: "Sarah W.",
        stripeSessionId: "cs_a",
        status: "paid" as const,
      });
      await ctx.db.insert("donations", {
        userId: donorId,
        amountPence: 1000,
        currency: "GBP" as const,
        giftAid: false,
        hideName: false,
        hideAmount: false,
        stripeSessionId: "cs_b",
        status: "paid" as const,
      });
      await ctx.db.insert("donations", {
        userId: donorId,
        amountPence: 1000,
        currency: "GBP" as const,
        giftAid: false,
        hideName: false,
        hideAmount: false,
        stripeSessionId: "cs_pending",
        status: "pending" as const,
      });

      await ctx.db.insert("tributes", {
        donationId: donationA,
        text: "ok",
        status: "approved" as const,
      });
      await ctx.db.insert("tributes", {
        donationId: donationA,
        text: "naughty",
        status: "pending" as const,
      });

      await ctx.db.insert("prizeEntries", {
        donationId: donationA,
        userId: donorId,
        method: "online" as const,
      });

      await ctx.db.insert("adminAuditLog", {
        action: "tribute.approve",
        actorUserId: adminId,
        actorEmail: "ops@bwf.org",
        targetType: "tribute",
        targetId: "t_1",
      });
    });

    const result = await t
      .withIdentity({ subject: adminId as unknown as string })
      .query(api.adminDashboard.dashboard, {});

    expect(result.paidDonations).toBe(2);
    expect(result.giftAidDonations).toBe(1);
    expect(result.raisedPence).toBe(3500);
    // Uplift on the £25 donation = £6.25; total banner = £35 + £6.25 = £41.25
    expect(result.raisedWithUpliftPence).toBe(4125);
    expect(result.seatsBlue).toBe(1);
    expect(result.totalSeats).toBe(2);
    expect(result.tributesApproved).toBe(1);
    expect(result.tributesPending).toBe(1);
    expect(result.prizeEntries).toBe(1);
    expect(result.recentDonations).toHaveLength(2);
    expect(result.recentAuditLog).toHaveLength(1);
    expect(result.recentAuditLog[0]?.action).toBe("tribute.approve");
  });
});
