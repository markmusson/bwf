/// <reference types="vite/client" />
// @vitest-environment edge-runtime

import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import {
  _createDraftForTest,
  _markPaidForTest,
  _recordEventForTest,
  type CreateDraftArgs,
} from "./donations";
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

describe("donations.markPaid", () => {
  async function setupDraft() {
    const { t, seatId, userId } = await setup();
    const draft = await t.run((ctx) =>
      _createDraftForTest(
        ctx,
        baseArgs({ userId, seatId, tributeText: "For Bob." }),
      ),
    );
    return { t, seatId, userId, donationId: draft.donationId };
  }

  test("flips donation to paid, marks seat taken, releases the hold", async () => {
    const { t, seatId, donationId } = await setupDraft();

    const result = await t.run((ctx) =>
      _markPaidForTest(ctx, {
        stripeSessionId: "cs_test_123",
        paymentIntentId: "pi_test_456",
      }),
    );

    expect(result).toEqual({ donationId, alreadyPaid: false });

    const donation = await t.run((ctx) => ctx.db.get(donationId));
    expect(donation?.status).toBe("paid");
    expect(donation?.stripePaymentIntentId).toBe("pi_test_456");

    const seat = await t.run((ctx) => ctx.db.get(seatId));
    expect(seat?.status).toBe("taken");
    expect(seat?.donationId).toBe(donationId);

    const holds = await t.run((ctx) => ctx.db.query("holds").collect());
    expect(holds).toHaveLength(0);
  });

  test("second call is a no-op and reports alreadyPaid:true", async () => {
    const { t, seatId, donationId } = await setupDraft();

    await t.run((ctx) =>
      _markPaidForTest(ctx, { stripeSessionId: "cs_test_123" }),
    );
    const second = await t.run((ctx) =>
      _markPaidForTest(ctx, {
        stripeSessionId: "cs_test_123",
        paymentIntentId: "pi_test_secondary",
      }),
    );

    expect(second).toEqual({ donationId, alreadyPaid: true });

    const donation = await t.run((ctx) => ctx.db.get(donationId));
    // The first call set the payment intent; the second must NOT overwrite.
    expect(donation?.stripePaymentIntentId).toBeUndefined();

    const seat = await t.run((ctx) => ctx.db.get(seatId));
    expect(seat?.status).toBe("taken");
  });

  test("missing donation returns donationId:null without throwing", async () => {
    const t = convexTest(schema, modules);
    const result = await t.run((ctx) =>
      _markPaidForTest(ctx, { stripeSessionId: "cs_test_unknown" }),
    );
    expect(result).toEqual({ donationId: null, alreadyPaid: false });
  });
});

describe("donations.aggregateStats", () => {
  test("zero state returns zero raised, zero seats blue", async () => {
    const t = convexTest(schema, modules);
    const stats = await t.query(api.donations.aggregateStats, {});
    expect(stats).toEqual({
      raisedPence: 0,
      seatsBlue: 0,
      supporters: 0,
      totalSeats: 0,
    });
  });

  test("counts paid donations + Gift Aid uplift, ignores pending", async () => {
    const t = convexTest(schema, modules);
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
      const userId = await ctx.db.insert("users", {});
      await ctx.db.insert("donations", {
        userId,
        amountPence: 1000,
        currency: "GBP" as const,
        giftAid: true,
        hideName: false,
        hideAmount: false,
        stripeSessionId: "cs_a",
        status: "paid" as const,
      });
      await ctx.db.insert("donations", {
        userId,
        amountPence: 5000,
        currency: "GBP" as const,
        giftAid: false,
        hideName: false,
        hideAmount: false,
        stripeSessionId: "cs_b",
        status: "paid" as const,
      });
      await ctx.db.insert("donations", {
        userId,
        amountPence: 9999,
        currency: "GBP" as const,
        giftAid: true,
        hideName: false,
        hideAmount: false,
        stripeSessionId: "cs_c",
        status: "pending" as const,
      });
    });

    const stats = await t.query(api.donations.aggregateStats, {});
    expect(stats.totalSeats).toBe(2);
    expect(stats.seatsBlue).toBe(1);
    expect(stats.supporters).toBe(2);
    // £10 + £10/4 (Gift Aid) + £50 = 1000 + 250 + 5000 = 6250
    expect(stats.raisedPence).toBe(6250);
  });
});

describe("donations.recordEvent (idempotency)", () => {
  test("first record inserts; second throws event_already_processed", async () => {
    const t = convexTest(schema, modules);
    await t.run((ctx) => _recordEventForTest(ctx, "evt_abc"));
    await expect(
      t.run((ctx) => _recordEventForTest(ctx, "evt_abc")),
    ).rejects.toMatchObject({ data: "event_already_processed" });
  });

  test("webhook replay protection: same event twice → one seat update", async () => {
    const { t, seatId, userId } = await setup();
    const draft = await t.run((ctx) =>
      _createDraftForTest(
        ctx,
        baseArgs({ userId, seatId, tributeText: "For Bob." }),
      ),
    );

    const replay = async () => {
      try {
        await t.run((ctx) => _recordEventForTest(ctx, "evt_replay"));
      } catch (err) {
        // Treat the duplicate-event error the same way the webhook
        // httpAction does: skip the rest.
        if (
          err instanceof Error &&
          (err as { data?: unknown }).data === "event_already_processed"
        ) {
          return;
        }
        throw err;
      }
      await t.run((ctx) =>
        _markPaidForTest(ctx, {
          stripeSessionId: "cs_test_123",
          paymentIntentId: "pi_test_456",
        }),
      );
    };

    await replay();
    await replay();

    const donations = await t.run((ctx) => ctx.db.query("donations").collect());
    expect(donations).toHaveLength(1);
    expect(donations[0]?.status).toBe("paid");
    expect(donations[0]?._id).toBe(draft.donationId);

    const seat = await t.run((ctx) => ctx.db.get(seatId));
    expect(seat?.status).toBe("taken");
    expect(seat?.donationId).toBe(draft.donationId);

    const events = await t.run((ctx) => ctx.db.query("stripeEvents").collect());
    expect(events).toHaveLength(1);
  });
});
