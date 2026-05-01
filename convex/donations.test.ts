/// <reference types="vite/client" />
// @vitest-environment edge-runtime

import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import {
  _createDraftForTest,
  _markPaidForTest,
  _recordEventForTest,
  type CreateDraftArgs,
} from "./donations";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const A_CLIENT = "client-aaaaaaaaaaaa";

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
  const holdId = await t.run((ctx) =>
    ctx.db.insert("holds", {
      seatId,
      clientHoldId: A_CLIENT,
      expiresAt: Date.now() + 10 * 60 * 1000,
    }),
  );
  return { t, seatId, clientHoldId: A_CLIENT, holdId };
}

function baseArgs(
  overrides: Partial<CreateDraftArgs> &
    Pick<CreateDraftArgs, "clientHoldId" | "seatId">,
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
    const { t, seatId, clientHoldId } = await setup();

    const result = await t.run((ctx) =>
      _createDraftForTest(
        ctx,
        baseArgs({ clientHoldId, seatId, tributeText: "For Bob." }),
      ),
    );

    const donation = await t.run((ctx) => ctx.db.get(result.donationId));
    expect(donation?.status).toBe("pending");
    expect(donation?.amountPence).toBe(1000);
    expect(donation?.stripeSessionId).toBe("cs_test_123");

    expect(result.tributeId).not.toBeNull();
    const tribute = await t.run((ctx) => ctx.db.get(result.tributeId!));
    // "For Bob." is clean — auto-approved by the inline profanity filter.
    expect(tribute?.status).toBe("approved");
    expect(tribute?.text).toBe("For Bob.");
    expect(tribute?.donationId).toBe(result.donationId);
  });

  test("quarantines a tribute that hits the profanity filter", async () => {
    const { t, seatId, clientHoldId } = await setup();
    const result = await t.run((ctx) =>
      _createDraftForTest(
        ctx,
        baseArgs({ clientHoldId, seatId, tributeText: "this is fucking bad" }),
      ),
    );
    const tribute = await t.run((ctx) => ctx.db.get(result.tributeId!));
    expect(tribute?.status).toBe("pending");
    expect(tribute?.profanityScore).toBeGreaterThan(0);
  });

  test("skips tribute creation when no text supplied", async () => {
    const { t, seatId, clientHoldId } = await setup();

    const result = await t.run((ctx) =>
      _createDraftForTest(ctx, baseArgs({ clientHoldId, seatId })),
    );

    expect(result.tributeId).toBeNull();
    const tributes = await t.run((ctx) => ctx.db.query("tributes").collect());
    expect(tributes).toHaveLength(0);
  });

  test("rejects amounts below the £10 floor", async () => {
    const { t, seatId, clientHoldId } = await setup();

    await expect(
      t.run((ctx) =>
        _createDraftForTest(
          ctx,
          baseArgs({ clientHoldId, seatId, amountPence: 999 }),
        ),
      ),
    ).rejects.toMatchObject({ data: "amount_below_minimum" });
  });

  test("rejects when there is no active hold for this client", async () => {
    const t = convexTest(schema, modules);
    const seatId = await t.run((ctx) =>
      ctx.db.insert("seats", {
        stand: "hollies",
        row: 0,
        num: 0,
        status: "available" as const,
      }),
    );

    await expect(
      t.run((ctx) =>
        _createDraftForTest(ctx, baseArgs({ clientHoldId: A_CLIENT, seatId })),
      ),
    ).rejects.toMatchObject({ data: "hold_required" });
  });

  test("rejects when the hold belongs to another clientHoldId", async () => {
    const { t, seatId } = await setup();

    await expect(
      t.run((ctx) =>
        _createDraftForTest(
          ctx,
          baseArgs({ clientHoldId: "client-zzzzzzzzzzzz", seatId }),
        ),
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
    await t.run((ctx) =>
      ctx.db.insert("holds", {
        seatId,
        clientHoldId: A_CLIENT,
        expiresAt: Date.now() - 1_000,
      }),
    );

    await expect(
      t.run((ctx) =>
        _createDraftForTest(ctx, baseArgs({ clientHoldId: A_CLIENT, seatId })),
      ),
    ).rejects.toMatchObject({ data: "hold_expired" });
  });
});

describe("donations.markPaid", () => {
  async function setupDraft() {
    const { t, seatId, clientHoldId } = await setup();
    const draft = await t.run((ctx) =>
      _createDraftForTest(
        ctx,
        baseArgs({ clientHoldId, seatId, tributeText: "For Bob." }),
      ),
    );
    return { t, seatId, donationId: draft.donationId };
  }

  test("flips donation to paid, marks seat taken, releases the hold, attaches user by Stripe email", async () => {
    const { t, seatId, donationId } = await setupDraft();

    const result = await t.run((ctx) =>
      _markPaidForTest(ctx, {
        stripeSessionId: "cs_test_123",
        paymentIntentId: "pi_test_456",
        donorEmail: "donor@example.com",
      }),
    );

    expect(result.donationId).toBe(donationId);
    expect(result.alreadyPaid).toBe(false);
    expect(result.userId).not.toBeNull();

    const donation = await t.run((ctx) => ctx.db.get(donationId));
    expect(donation?.status).toBe("paid");
    expect(donation?.stripePaymentIntentId).toBe("pi_test_456");
    expect(donation?.donorEmail).toBe("donor@example.com");
    expect(donation?.userId).toBe(result.userId!);

    const user = await t.run((ctx) => ctx.db.get(result.userId!));
    expect(user?.email).toBe("donor@example.com");

    const seat = await t.run((ctx) => ctx.db.get(seatId));
    expect(seat?.status).toBe("taken");
    expect(seat?.donationId).toBe(donationId);

    const holds = await t.run((ctx) => ctx.db.query("holds").collect());
    expect(holds).toHaveLength(0);
  });

  test("reuses an existing user when the Stripe email matches a known account", async () => {
    const { t, donationId } = await setupDraft();
    const existing = await t.run((ctx) =>
      ctx.db.insert("users", { email: "returning@example.com" }),
    );

    const result = await t.run((ctx) =>
      _markPaidForTest(ctx, {
        stripeSessionId: "cs_test_123",
        donorEmail: "Returning@Example.com",
      }),
    );

    expect(result.userId).toBe(existing);
    const donation = await t.run((ctx) => ctx.db.get(donationId));
    expect(donation?.userId).toBe(existing);
    expect(donation?.donorEmail).toBe("returning@example.com");
  });

  test("second call is a no-op and reports alreadyPaid:true", async () => {
    const { t, seatId, donationId } = await setupDraft();

    await t.run((ctx) =>
      _markPaidForTest(ctx, {
        stripeSessionId: "cs_test_123",
        donorEmail: "donor@example.com",
      }),
    );
    const second = await t.run((ctx) =>
      _markPaidForTest(ctx, {
        stripeSessionId: "cs_test_123",
        paymentIntentId: "pi_test_secondary",
        donorEmail: "different@example.com",
      }),
    );

    expect(second.donationId).toBe(donationId);
    expect(second.alreadyPaid).toBe(true);

    const donation = await t.run((ctx) => ctx.db.get(donationId));
    // First call set the payment intent + email; second must NOT overwrite.
    expect(donation?.stripePaymentIntentId).toBeUndefined();
    expect(donation?.donorEmail).toBe("donor@example.com");

    const seat = await t.run((ctx) => ctx.db.get(seatId));
    expect(seat?.status).toBe("taken");
  });

  test("missing donation returns donationId:null without throwing", async () => {
    const t = convexTest(schema, modules);
    const result = await t.run((ctx) =>
      _markPaidForTest(ctx, { stripeSessionId: "cs_test_unknown" }),
    );
    expect(result).toEqual({
      donationId: null,
      alreadyPaid: false,
      userId: null,
    });
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
    const { t, seatId, clientHoldId } = await setup();
    const draft = await t.run((ctx) =>
      _createDraftForTest(
        ctx,
        baseArgs({ clientHoldId, seatId, tributeText: "For Bob." }),
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

describe("donations.giftAidExport", () => {
  const originalAdminEmails = process.env.ADMIN_EMAILS;

  beforeEach(() => {
    process.env.ADMIN_EMAILS = "ops@bwf.org";
  });

  afterEach(() => {
    if (originalAdminEmails === undefined) {
      delete process.env.ADMIN_EMAILS;
    } else {
      process.env.ADMIN_EMAILS = originalAdminEmails;
    }
  });

  test("rejects non-admin callers", async () => {
    const t = convexTest(schema, modules);
    const stranger = await t.run((ctx) =>
      ctx.db.insert("users", { email: "stranger@example.com" }),
    );
    await expect(
      t
        .withIdentity({ subject: stranger as unknown as string })
        .query(api.donations.giftAidExport, {}),
    ).rejects.toMatchObject({ data: "forbidden" });
  });

  test("returns only paid + giftAid=true donations", async () => {
    const t = convexTest(schema, modules);
    const adminId = await t.run((ctx) =>
      ctx.db.insert("users", { email: "ops@bwf.org" }),
    );
    const donorId = await t.run((ctx) =>
      ctx.db.insert("users", { email: "donor@example.com" }),
    );
    await t.run(async (ctx) => {
      await ctx.db.insert("donations", {
        userId: donorId,
        amountPence: 2500,
        currency: "GBP" as const,
        giftAid: true,
        hideName: false,
        hideAmount: false,
        displayName: "Sarah W.",
        stripeSessionId: "cs_a",
        stripePaymentIntentId: "pi_a",
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
        giftAid: true,
        hideName: false,
        hideAmount: false,
        stripeSessionId: "cs_c",
        status: "pending" as const,
      });
    });

    const rows = await t
      .withIdentity({ subject: adminId as unknown as string })
      .query(api.donations.giftAidExport, {});
    expect(rows).toHaveLength(1);
    expect(rows[0]?.email).toBe("donor@example.com");
    expect(rows[0]?.displayName).toBe("Sarah W.");
    expect(rows[0]?.amountPence).toBe(2500);
    expect(rows[0]?.upliftPence).toBe(625);
    expect(rows[0]?.stripePaymentIntentId).toBe("pi_a");
    expect(rows[0]?.donationDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("donations.listByClient (no auth, by browser id)", () => {
  test("returns donations created from this browser", async () => {
    const t = convexTest(schema, modules);
    const donationId = await t.run(async (ctx) => {
      const seatId = await ctx.db.insert("seats", {
        stand: "hollies",
        row: 0,
        num: 0,
        status: "taken" as const,
      });
      return await ctx.db.insert("donations", {
        clientHoldId: A_CLIENT,
        seatId,
        amountPence: 2500,
        currency: "GBP" as const,
        giftAid: true,
        hideName: false,
        hideAmount: false,
        displayName: "Sarah W.",
        stripeSessionId: "cs_x",
        status: "paid" as const,
      });
    });
    const rows = await t.query(api.donations.listByClient, {
      clientHoldId: A_CLIENT,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.donation._id).toBe(donationId);
  });

  test("returns nothing for a different client id", async () => {
    const t = convexTest(schema, modules);
    await t.run((ctx) =>
      ctx.db.insert("donations", {
        clientHoldId: A_CLIENT,
        amountPence: 1000,
        currency: "GBP" as const,
        giftAid: false,
        hideName: false,
        hideAmount: false,
        stripeSessionId: "cs_x",
        status: "paid" as const,
      }),
    );
    const rows = await t.query(api.donations.listByClient, {
      clientHoldId: "client-zzzzzzzzzzzz",
    });
    expect(rows).toEqual([]);
  });
});

describe("donations.update (auth or clientHoldId match)", () => {
  test("rejects when neither auth nor clientHoldId match", async () => {
    const t = convexTest(schema, modules);
    const donationId = await t.run((ctx) =>
      ctx.db.insert("donations", {
        clientHoldId: A_CLIENT,
        amountPence: 1000,
        currency: "GBP" as const,
        giftAid: false,
        hideName: false,
        hideAmount: false,
        stripeSessionId: "cs_x",
        status: "paid" as const,
      }),
    );
    await expect(
      t.mutation(api.donations.update, {
        donationId,
        clientHoldId: "client-zzzzzzzzzzzz",
        displayName: "hijack",
      }),
    ).rejects.toMatchObject({ data: "unauthenticated" });
  });

  test("accepts the patch when clientHoldId matches the donation", async () => {
    const t = convexTest(schema, modules);
    const donationId = await t.run((ctx) =>
      ctx.db.insert("donations", {
        clientHoldId: A_CLIENT,
        amountPence: 1000,
        currency: "GBP" as const,
        giftAid: false,
        hideName: false,
        hideAmount: false,
        stripeSessionId: "cs_x",
        status: "paid" as const,
      }),
    );
    await t.mutation(api.donations.update, {
      donationId,
      clientHoldId: A_CLIENT,
      displayName: "Sarah W.",
    });
    const updated = await t.run((ctx) => ctx.db.get(donationId));
    expect(updated?.displayName).toBe("Sarah W.");
  });
});

describe("donations.getThanksBySession", () => {
  test("returns null for an unknown session id", async () => {
    const t = convexTest(schema, modules);
    const result = await t.query(api.donations.getThanksBySession, {
      stripeSessionId: "cs_unknown",
    });
    expect(result).toBeNull();
  });

  test("returns null while the donation is still pending (webhook not yet)", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {});
      await ctx.db.insert("donations", {
        userId,
        amountPence: 1000,
        currency: "GBP" as const,
        giftAid: false,
        hideName: false,
        hideAmount: false,
        stripeSessionId: "cs_thx_pending",
        status: "pending" as const,
      });
    });
    const result = await t.query(api.donations.getThanksBySession, {
      stripeSessionId: "cs_thx_pending",
    });
    expect(result).toBeNull();
  });

  test("returns the public-safe shape for a paid donation, including seat slug + tribute", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {});
      const seatId = await ctx.db.insert("seats", {
        stand: "wyatt",
        row: 2,
        num: 4,
        status: "taken" as const,
      });
      const donationId = await ctx.db.insert("donations", {
        userId,
        seatId,
        amountPence: 2500,
        currency: "GBP" as const,
        giftAid: true,
        hideName: false,
        hideAmount: false,
        displayName: "Sarah W.",
        stripeSessionId: "cs_thx_paid",
        status: "paid" as const,
      });
      await ctx.db.patch(seatId, { donationId });
      await ctx.db.insert("tributes", {
        donationId,
        text: "For Bob.",
        status: "approved" as const,
      });
    });
    const result = await t.query(api.donations.getThanksBySession, {
      stripeSessionId: "cs_thx_paid",
    });
    expect(result).toMatchObject({
      donationId: expect.any(String),
      amountPence: 2500,
      giftAid: true,
      displayName: "Sarah W.",
      seat: { stand: "wyatt", row: 2, num: 4, slug: "wyatt-3-5" },
      tribute: { text: "For Bob.", status: "approved" },
    });
  });

  test("does not expose the donor's email or stripePaymentIntent", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        email: "secret@example.com",
      });
      await ctx.db.insert("donations", {
        userId,
        amountPence: 1000,
        currency: "GBP" as const,
        giftAid: false,
        hideName: false,
        hideAmount: false,
        stripeSessionId: "cs_thx_priv",
        stripePaymentIntentId: "pi_secret",
        status: "paid" as const,
      });
    });
    const result = await t.query(api.donations.getThanksBySession, {
      stripeSessionId: "cs_thx_priv",
    });
    const json = JSON.stringify(result);
    expect(json).not.toContain("secret@example.com");
    expect(json).not.toContain("pi_secret");
  });

  test("masks the display name when hideName is true (renders Anonymous)", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {});
      await ctx.db.insert("donations", {
        userId,
        amountPence: 1000,
        currency: "GBP" as const,
        giftAid: false,
        hideName: true,
        hideAmount: false,
        displayName: "Sarah W.",
        stripeSessionId: "cs_thx_anon",
        status: "paid" as const,
      });
    });
    const result = await t.query(api.donations.getThanksBySession, {
      stripeSessionId: "cs_thx_anon",
    });
    expect(result?.displayName).toBeNull();
  });
});
