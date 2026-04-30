/// <reference types="vite/client" />
// @vitest-environment edge-runtime

import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { _updateForTest } from "./tributes";

const modules = import.meta.glob("./**/*.ts");

async function setup() {
  const t = convexTest(schema, modules);
  const userId = await t.run((ctx) => ctx.db.insert("users", {}));
  const donationId = await t.run((ctx) =>
    ctx.db.insert("donations", {
      userId,
      amountPence: 1000,
      currency: "GBP" as const,
      giftAid: false,
      hideName: false,
      hideAmount: false,
      stripeSessionId: "cs_test",
      status: "paid" as const,
    }),
  );
  return { t, userId, donationId };
}

describe("tributes.update", () => {
  test("creates a new tribute and auto-approves clean text", async () => {
    const { t, userId, donationId } = await setup();
    const result = await t.run((ctx) =>
      _updateForTest(ctx, { userId, donationId, text: "For Bob." }),
    );
    const tribute = await t.run((ctx) => ctx.db.get(result.tributeId));
    expect(tribute?.text).toBe("For Bob.");
    expect(tribute?.status).toBe("approved");
  });

  test("quarantines a tribute that hits the profanity filter", async () => {
    const { t, userId, donationId } = await setup();
    const result = await t.run((ctx) =>
      _updateForTest(ctx, {
        userId,
        donationId,
        text: "this is fucking bad",
      }),
    );
    const tribute = await t.run((ctx) => ctx.db.get(result.tributeId));
    expect(tribute?.status).toBe("pending");
    expect(tribute?.profanityScore).toBeGreaterThan(0);
  });

  test("re-checks an existing tribute on edit; clean edit goes back to approved", async () => {
    const { t, userId, donationId } = await setup();
    const tributeId = await t.run((ctx) =>
      ctx.db.insert("tributes", {
        donationId,
        text: "First version",
        status: "approved" as const,
      }),
    );
    await t.run((ctx) =>
      _updateForTest(ctx, { userId, donationId, text: "Edited but clean" }),
    );
    const tribute = await t.run((ctx) => ctx.db.get(tributeId));
    expect(tribute?.text).toBe("Edited but clean");
    expect(tribute?.status).toBe("approved");
  });

  test("re-checks an existing tribute on edit; dirty edit drops to pending", async () => {
    const { t, userId, donationId } = await setup();
    const tributeId = await t.run((ctx) =>
      ctx.db.insert("tributes", {
        donationId,
        text: "First version",
        status: "approved" as const,
      }),
    );
    await t.run((ctx) =>
      _updateForTest(ctx, {
        userId,
        donationId,
        text: "this is fucking bad",
      }),
    );
    const tribute = await t.run((ctx) => ctx.db.get(tributeId));
    expect(tribute?.status).toBe("pending");
  });

  test("rejects edits from someone who isn't the donor", async () => {
    const { t, donationId } = await setup();
    const otherUser = await t.run((ctx) => ctx.db.insert("users", {}));
    await expect(
      t.run((ctx) =>
        _updateForTest(ctx, {
          userId: otherUser,
          donationId,
          text: "hijack",
        }),
      ),
    ).rejects.toMatchObject({ data: "forbidden" });
  });

  test("rejects text over 280 chars", async () => {
    const { t, userId, donationId } = await setup();
    await expect(
      t.run((ctx) =>
        _updateForTest(ctx, {
          userId,
          donationId,
          text: "x".repeat(281),
        }),
      ),
    ).rejects.toMatchObject({ data: "tribute_too_long" });
  });

  test("rejects empty new tributes (use update with empty text only to clear an existing one)", async () => {
    const { t, userId, donationId } = await setup();
    await expect(
      t.run((ctx) => _updateForTest(ctx, { userId, donationId, text: "   " })),
    ).rejects.toMatchObject({ data: "tribute_empty" });
  });
});

describe("tributes.adminApprove / adminReject", () => {
  const originalAdminEmails = process.env.ADMIN_EMAILS;

  beforeEach(() => {
    process.env.ADMIN_EMAILS = "mod@bwf.org";
  });

  afterEach(() => {
    if (originalAdminEmails === undefined) {
      delete process.env.ADMIN_EMAILS;
    } else {
      process.env.ADMIN_EMAILS = originalAdminEmails;
    }
  });

  async function arrange() {
    const t = convexTest(schema, modules);
    const adminId = await t.run((ctx) =>
      ctx.db.insert("users", { email: "mod@bwf.org" }),
    );
    const donorId = await t.run((ctx) => ctx.db.insert("users", {}));
    const donationId = await t.run((ctx) =>
      ctx.db.insert("donations", {
        userId: donorId,
        amountPence: 1000,
        currency: "GBP" as const,
        giftAid: false,
        hideName: false,
        hideAmount: false,
        stripeSessionId: "cs_t",
        status: "paid" as const,
      }),
    );
    const tributeId = await t.run((ctx) =>
      ctx.db.insert("tributes", {
        donationId,
        text: "questionable",
        status: "pending" as const,
        profanityScore: 4,
      }),
    );
    return { t, adminId, tributeId };
  }

  test("adminApprove rejects non-admin", async () => {
    const { t, tributeId } = await arrange();
    const stranger = await t.run((ctx) =>
      ctx.db.insert("users", { email: "nobody@example.com" }),
    );
    await expect(
      t
        .withIdentity({ subject: stranger as unknown as string })
        .mutation(api.tributes.adminApprove, { tributeId }),
    ).rejects.toMatchObject({ data: "forbidden" });
  });

  test("adminApprove flips status to approved + writes audit log", async () => {
    const { t, adminId, tributeId } = await arrange();
    const result = await t
      .withIdentity({ subject: adminId as unknown as string })
      .mutation(api.tributes.adminApprove, { tributeId });
    expect(result.approvedBy).toBe("mod@bwf.org");
    const tribute = await t.run((ctx) => ctx.db.get(tributeId));
    expect(tribute?.status).toBe("approved");
    const log = await t.run((ctx) => ctx.db.query("adminAuditLog").collect());
    expect(log).toHaveLength(1);
    expect(log[0]?.action).toBe("tribute.approve");
    expect(log[0]?.actorEmail).toBe("mod@bwf.org");
    expect(log[0]?.targetId).toBe(tributeId);
  });

  test("adminReject flips status to rejected + writes audit log", async () => {
    const { t, adminId, tributeId } = await arrange();
    await t
      .withIdentity({ subject: adminId as unknown as string })
      .mutation(api.tributes.adminReject, { tributeId });
    const tribute = await t.run((ctx) => ctx.db.get(tributeId));
    expect(tribute?.status).toBe("rejected");
    const log = await t.run((ctx) => ctx.db.query("adminAuditLog").collect());
    expect(log[0]?.action).toBe("tribute.reject");
  });
});
