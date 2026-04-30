/// <reference types="vite/client" />
// @vitest-environment edge-runtime

import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { _createDraftForTest, type CreateDraftArgs } from "./donations";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function setup() {
  const t = convexTest(schema, modules);
  const seatId = await t.run(async (ctx) =>
    ctx.db.insert("seats", {
      stand: "hollies",
      row: 0,
      num: 0,
      status: "available" as const,
    }),
  );
  const userId = await t.run((ctx) => ctx.db.insert("users", {}));
  const holdId = await t.run((ctx) =>
    ctx.db.insert("holds", {
      seatId,
      userId,
      expiresAt: Date.now() + 10 * 60 * 1000,
    }),
  );
  return { t, seatId, userId, holdId };
}

function baseArgs(
  overrides: Partial<CreateDraftArgs> &
    Pick<CreateDraftArgs, "userId" | "seatId">,
): CreateDraftArgs {
  return {
    amountPence: 1000,
    giftAid: false,
    hideName: false,
    hideAmount: false,
    stripeSessionId: "cs_test_123",
    ...overrides,
  };
}

describe("donations.createDraft", () => {
  test("inserts donation(pending) + tribute(pending) when tribute text is set", async () => {
    const { t, seatId, userId } = await setup();

    const result = await t.run((ctx) =>
      _createDraftForTest(
        ctx,
        baseArgs({ userId, seatId, tributeText: "For Bob." }),
      ),
    );

    const donation = await t.run((ctx) => ctx.db.get(result.donationId));
    expect(donation?.status).toBe("pending");
    expect(donation?.amountPence).toBe(1000);
    expect(donation?.stripeSessionId).toBe("cs_test_123");

    expect(result.tributeId).not.toBeNull();
    const tribute = await t.run((ctx) => ctx.db.get(result.tributeId!));
    expect(tribute?.status).toBe("pending");
    expect(tribute?.text).toBe("For Bob.");
    expect(tribute?.donationId).toBe(result.donationId);
  });

  test("skips tribute creation when no text supplied", async () => {
    const { t, seatId, userId } = await setup();

    const result = await t.run((ctx) =>
      _createDraftForTest(ctx, baseArgs({ userId, seatId })),
    );

    expect(result.tributeId).toBeNull();
    const tributes = await t.run((ctx) => ctx.db.query("tributes").collect());
    expect(tributes).toHaveLength(0);
  });

  test("rejects amounts below the £10 floor", async () => {
    const { t, seatId, userId } = await setup();

    await expect(
      t.run((ctx) =>
        _createDraftForTest(
          ctx,
          baseArgs({ userId, seatId, amountPence: 999 }),
        ),
      ),
    ).rejects.toMatchObject({ data: "amount_below_minimum" });
  });

  test("rejects when there is no active hold for this user", async () => {
    const t = convexTest(schema, modules);
    const seatId = await t.run((ctx) =>
      ctx.db.insert("seats", {
        stand: "hollies",
        row: 0,
        num: 0,
        status: "available" as const,
      }),
    );
    const userId = await t.run((ctx) => ctx.db.insert("users", {}));

    await expect(
      t.run((ctx) => _createDraftForTest(ctx, baseArgs({ userId, seatId }))),
    ).rejects.toMatchObject({ data: "hold_required" });
  });

  test("rejects when the hold belongs to another user", async () => {
    const { t, seatId } = await setup();
    const otherUser = await t.run((ctx) => ctx.db.insert("users", {}));

    await expect(
      t.run((ctx) =>
        _createDraftForTest(ctx, baseArgs({ userId: otherUser, seatId })),
      ),
    ).rejects.toMatchObject({ data: "hold_required" });
  });

  test("rejects when the hold has expired", async () => {
    const t = convexTest(schema, modules);
    const seatId = await t.run((ctx) =>
      ctx.db.insert("seats", {
        stand: "hollies",
        row: 0,
        num: 0,
        status: "available" as const,
      }),
    );
    const userId = await t.run((ctx) => ctx.db.insert("users", {}));
    await t.run((ctx) =>
      ctx.db.insert("holds", {
        seatId,
        userId,
        expiresAt: Date.now() - 1_000,
      }),
    );

    await expect(
      t.run((ctx) => _createDraftForTest(ctx, baseArgs({ userId, seatId }))),
    ).rejects.toMatchObject({ data: "hold_expired" });
  });
});
