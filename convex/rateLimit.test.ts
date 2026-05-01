/// <reference types="vite/client" />
// @vitest-environment edge-runtime

import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { consumeRateLimit } from "./rateLimit";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("consumeRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-29T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("first call inserts a row with count 1", async () => {
    const t = convexTest(schema, modules);
    await t.run((ctx) =>
      consumeRateLimit(ctx, "k", { capacity: 3, windowMs: 1000 }),
    );
    const rows = await t.run((ctx) => ctx.db.query("rateLimits").collect());
    expect(rows).toHaveLength(1);
    expect(rows[0]?.count).toBe(1);
    expect(rows[0]?.key).toBe("k");
  });

  test("subsequent calls within the window increment count up to capacity", async () => {
    const t = convexTest(schema, modules);
    for (let i = 0; i < 3; i++) {
      await t.run((ctx) =>
        consumeRateLimit(ctx, "k", { capacity: 3, windowMs: 1000 }),
      );
    }
    const rows = await t.run((ctx) => ctx.db.query("rateLimits").collect());
    expect(rows[0]?.count).toBe(3);
  });

  test("capacity + 1 throws rate_limited", async () => {
    const t = convexTest(schema, modules);
    for (let i = 0; i < 3; i++) {
      await t.run((ctx) =>
        consumeRateLimit(ctx, "k", { capacity: 3, windowMs: 1000 }),
      );
    }
    await expect(
      t.run((ctx) =>
        consumeRateLimit(ctx, "k", { capacity: 3, windowMs: 1000 }),
      ),
    ).rejects.toMatchObject({ data: "rate_limited" });
  });

  test("after the window expires, count resets and next call passes", async () => {
    const t = convexTest(schema, modules);
    for (let i = 0; i < 3; i++) {
      await t.run((ctx) =>
        consumeRateLimit(ctx, "k", { capacity: 3, windowMs: 1000 }),
      );
    }
    vi.advanceTimersByTime(1500);
    await t.run((ctx) =>
      consumeRateLimit(ctx, "k", { capacity: 3, windowMs: 1000 }),
    );
    const rows = await t.run((ctx) => ctx.db.query("rateLimits").collect());
    expect(rows[0]?.count).toBe(1);
  });

  test("different keys are independent", async () => {
    const t = convexTest(schema, modules);
    for (let i = 0; i < 3; i++) {
      await t.run((ctx) =>
        consumeRateLimit(ctx, "a", { capacity: 3, windowMs: 1000 }),
      );
    }
    // 'b' should still be fresh
    await t.run((ctx) =>
      consumeRateLimit(ctx, "b", { capacity: 3, windowMs: 1000 }),
    );
    const rows = await t.run((ctx) => ctx.db.query("rateLimits").collect());
    expect(rows).toHaveLength(2);
  });
});

describe("rate-limit integration on user-facing mutations", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-29T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("createDraft throws rate_limited after 10 calls in 60s", async () => {
    const t = convexTest(schema, modules);
    const seatId = await t.run((ctx) =>
      ctx.db.insert("seats", {
        stand: "wyatt",
        row: 0,
        num: 0,
        status: "available" as const,
      }),
    );
    const clientHoldId = "client-rate-limit";
    await t.run((ctx) =>
      ctx.db.insert("holds", {
        seatId,
        clientHoldId,
        expiresAt: Date.now() + 60_000,
      }),
    );

    const { _createDraftForTest } = await import("./donations");
    const baseArgs = {
      clientHoldId,
      seatId,
      amountPence: 1000,
      giftAid: false,
      hideName: false,
      hideAmount: false,
    };

    for (let i = 0; i < 10; i++) {
      await t.run((ctx) =>
        _createDraftForTest(ctx, {
          ...baseArgs,
          stripeSessionId: `cs_${i}`,
        }),
      );
    }
    await expect(
      t.run((ctx) =>
        _createDraftForTest(ctx, {
          ...baseArgs,
          stripeSessionId: "cs_burst",
        }),
      ),
    ).rejects.toMatchObject({ data: "rate_limited" });
  });
});
