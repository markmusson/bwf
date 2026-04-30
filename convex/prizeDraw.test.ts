/// <reference types="vite/client" />
// @vitest-environment edge-runtime

import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { _optInForTest } from "./prizeDraw";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function setup(status: "pending" | "paid" | "failed" = "paid") {
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
      status,
    }),
  );
  return { t, userId, donationId };
}

describe("prizeDraw.optIn", () => {
  test("creates a prizeEntries row for a paid donation", async () => {
    const { t, userId, donationId } = await setup("paid");
    const result = await t.run((ctx) =>
      _optInForTest(ctx, { donationId, userId }),
    );
    expect(result.alreadyEntered).toBe(false);
    const entry = await t.run((ctx) => ctx.db.get(result.entryId));
    expect(entry?.method).toBe("online");
    expect(entry?.donationId).toBe(donationId);
    expect(entry?.userId).toBe(userId);
  });

  test("is idempotent — second call returns the same entry id", async () => {
    const { t, userId, donationId } = await setup("paid");
    const first = await t.run((ctx) =>
      _optInForTest(ctx, { donationId, userId }),
    );
    const second = await t.run((ctx) =>
      _optInForTest(ctx, { donationId, userId }),
    );
    expect(second.entryId).toBe(first.entryId);
    expect(second.alreadyEntered).toBe(true);
    const entries = await t.run((ctx) =>
      ctx.db.query("prizeEntries").collect(),
    );
    expect(entries).toHaveLength(1);
  });

  test("rejects when the donation is still pending", async () => {
    const { t, userId, donationId } = await setup("pending");
    await expect(
      t.run((ctx) => _optInForTest(ctx, { donationId, userId })),
    ).rejects.toMatchObject({ data: "donation_not_paid" });
  });

  test("rejects when the donation belongs to another user", async () => {
    const { t, donationId } = await setup("paid");
    const otherUser = await t.run((ctx) => ctx.db.insert("users", {}));
    await expect(
      t.run((ctx) => _optInForTest(ctx, { donationId, userId: otherUser })),
    ).rejects.toMatchObject({ data: "forbidden" });
  });
});
