/// <reference types="vite/client" />
// @vitest-environment edge-runtime

import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
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
  test("creates a new tribute when none exists", async () => {
    const { t, userId, donationId } = await setup();
    const result = await t.run((ctx) =>
      _updateForTest(ctx, { userId, donationId, text: "For Bob." }),
    );
    const tribute = await t.run((ctx) => ctx.db.get(result.tributeId));
    expect(tribute?.text).toBe("For Bob.");
    expect(tribute?.status).toBe("pending");
  });

  test("re-flips an existing approved tribute back to pending on edit", async () => {
    const { t, userId, donationId } = await setup();
    const tributeId = await t.run((ctx) =>
      ctx.db.insert("tributes", {
        donationId,
        text: "First version",
        status: "approved" as const,
      }),
    );
    await t.run((ctx) =>
      _updateForTest(ctx, { userId, donationId, text: "Edited" }),
    );
    const tribute = await t.run((ctx) => ctx.db.get(tributeId));
    expect(tribute?.text).toBe("Edited");
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
