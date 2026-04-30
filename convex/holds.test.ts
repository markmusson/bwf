/// <reference types="vite/client" />
// @vitest-environment edge-runtime

import { convexTest } from "convex-test";
import { ConvexError } from "convex/values";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { _claimSeatForTest } from "./holds";

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
  const [u1, u2] = await Promise.all([
    t.run(async (ctx) => ctx.db.insert("users", {})),
    t.run(async (ctx) => ctx.db.insert("users", {})),
  ]);
  return { t, seatId, u1: u1!, u2: u2! };
}

describe("holds.claim concurrency", () => {
  test("two simultaneous claims for the same seat — exactly one wins", async () => {
    const { t, seatId, u1, u2 } = await setup();

    const results = await Promise.allSettled([
      t.run((ctx) => _claimSeatForTest(ctx, seatId, u1)),
      t.run((ctx) => _claimSeatForTest(ctx, seatId, u2)),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const losingError = (rejected[0] as PromiseRejectedResult).reason;
    expect(losingError).toBeInstanceOf(ConvexError);
    expect((losingError as ConvexError<string>).data).toBe("seat_held");

    const holds = await t.run(async (ctx) => ctx.db.query("holds").collect());
    expect(holds).toHaveLength(1);
  });

  test("re-claiming your own active hold no-ops (replaces the row)", async () => {
    const { t, seatId, u1 } = await setup();

    await t.run((ctx) => _claimSeatForTest(ctx, seatId, u1));
    await t.run((ctx) => _claimSeatForTest(ctx, seatId, u1));

    const holds = await t.run(async (ctx) => ctx.db.query("holds").collect());
    expect(holds).toHaveLength(1);
    expect(holds[0]?.userId).toBe(u1);
  });

  test("an expired hold from another user lets the next user claim", async () => {
    const { t, seatId, u1, u2 } = await setup();

    await t.run(async (ctx) =>
      ctx.db.insert("holds", {
        seatId,
        userId: u1,
        expiresAt: Date.now() - 1_000,
      }),
    );

    await t.run((ctx) => _claimSeatForTest(ctx, seatId, u2));

    const holds = await t.run(async (ctx) => ctx.db.query("holds").collect());
    expect(holds).toHaveLength(1);
    expect(holds[0]?.userId).toBe(u2);
  });

  test("seat already taken — rejects with seat_unavailable", async () => {
    const t = convexTest(schema, modules);
    const seatId = await t.run(async (ctx) =>
      ctx.db.insert("seats", {
        stand: "hollies",
        row: 0,
        num: 0,
        status: "taken" as const,
      }),
    );
    const u1 = await t.run((ctx) => ctx.db.insert("users", {}));

    await expect(
      t.run((ctx) => _claimSeatForTest(ctx, seatId, u1)),
    ).rejects.toMatchObject({ data: "seat_unavailable" });
  });
});

describe("holds.activeSeatIds", () => {
  test("returns only the seat ids of holds that haven't expired", async () => {
    const t = convexTest(schema, modules);
    const [seatA, seatB] = await Promise.all([
      t.run((ctx) =>
        ctx.db.insert("seats", {
          stand: "hollies",
          row: 0,
          num: 0,
          status: "available" as const,
        }),
      ),
      t.run((ctx) =>
        ctx.db.insert("seats", {
          stand: "hollies",
          row: 0,
          num: 1,
          status: "available" as const,
        }),
      ),
    ]);
    const u1 = await t.run((ctx) => ctx.db.insert("users", {}));

    await t.run((ctx) =>
      ctx.db.insert("holds", {
        seatId: seatA!,
        userId: u1,
        expiresAt: Date.now() + 60_000,
      }),
    );
    await t.run((ctx) =>
      ctx.db.insert("holds", {
        seatId: seatB!,
        userId: u1,
        expiresAt: Date.now() - 60_000,
      }),
    );

    const ids = await t.query(api.holds.activeSeatIds, {});
    expect(ids).toEqual([seatA]);
  });
});
