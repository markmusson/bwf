/// <reference types="vite/client" />
// @vitest-environment edge-runtime

import { convexTest } from "convex-test";
import { ConvexError } from "convex/values";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { _claimSeatForTest } from "./holds";

const modules = import.meta.glob("./**/*.ts");

const A_CLIENT = "client-aaaaaaaaaaaa";
const B_CLIENT = "client-bbbbbbbbbbbb";

async function setupSeat(status: "available" | "taken" = "available") {
  const t = convexTest(schema, modules);
  const seatId = await t.run((ctx) =>
    ctx.db.insert("seats", {
      stand: "hollies",
      row: 0,
      num: 0,
      status,
    }),
  );
  return { t, seatId };
}

describe("holds.claim concurrency (clientHoldId-keyed, no auth)", () => {
  test("two simultaneous claims for the same seat — exactly one wins", async () => {
    const { t, seatId } = await setupSeat();

    const results = await Promise.allSettled([
      t.run((ctx) =>
        _claimSeatForTest(ctx, { seatId, clientHoldId: A_CLIENT }),
      ),
      t.run((ctx) =>
        _claimSeatForTest(ctx, { seatId, clientHoldId: B_CLIENT }),
      ),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const losingError = (rejected[0] as PromiseRejectedResult).reason;
    expect(losingError).toBeInstanceOf(ConvexError);
    expect((losingError as ConvexError<string>).data).toBe("seat_held");

    const holds = await t.run((ctx) => ctx.db.query("holds").collect());
    expect(holds).toHaveLength(1);
  });

  test("re-claiming with the same clientHoldId no-ops (replaces the row)", async () => {
    const { t, seatId } = await setupSeat();

    await t.run((ctx) =>
      _claimSeatForTest(ctx, { seatId, clientHoldId: A_CLIENT }),
    );
    await t.run((ctx) =>
      _claimSeatForTest(ctx, { seatId, clientHoldId: A_CLIENT }),
    );

    const holds = await t.run((ctx) => ctx.db.query("holds").collect());
    expect(holds).toHaveLength(1);
    expect(holds[0]?.clientHoldId).toBe(A_CLIENT);
  });

  test("an expired hold from another client lets the next claim win", async () => {
    const { t, seatId } = await setupSeat();

    await t.run((ctx) =>
      ctx.db.insert("holds", {
        seatId,
        clientHoldId: A_CLIENT,
        expiresAt: Date.now() - 1_000,
      }),
    );

    await t.run((ctx) =>
      _claimSeatForTest(ctx, { seatId, clientHoldId: B_CLIENT }),
    );

    const holds = await t.run((ctx) => ctx.db.query("holds").collect());
    expect(holds).toHaveLength(1);
    expect(holds[0]?.clientHoldId).toBe(B_CLIENT);
  });

  test("seat already taken — rejects with seat_unavailable", async () => {
    const { t, seatId } = await setupSeat("taken");

    await expect(
      t.run((ctx) =>
        _claimSeatForTest(ctx, { seatId, clientHoldId: A_CLIENT }),
      ),
    ).rejects.toMatchObject({ data: "seat_unavailable" });
  });
});

describe("holds.getMine (no auth, keyed by clientHoldId)", () => {
  test("returns the active hold for the caller's clientHoldId", async () => {
    const { t, seatId } = await setupSeat();
    await t.run((ctx) =>
      _claimSeatForTest(ctx, { seatId, clientHoldId: A_CLIENT }),
    );
    const result = await t.query(api.holds.getMine, {
      clientHoldId: A_CLIENT,
    });
    expect(result?.seatId).toBe(seatId);
    expect(result?.clientHoldId).toBe(A_CLIENT);
  });

  test("returns null for a different clientHoldId", async () => {
    const { t, seatId } = await setupSeat();
    await t.run((ctx) =>
      _claimSeatForTest(ctx, { seatId, clientHoldId: A_CLIENT }),
    );
    const result = await t.query(api.holds.getMine, {
      clientHoldId: B_CLIENT,
    });
    expect(result).toBeNull();
  });

  test("returns null once the hold has expired", async () => {
    const { t, seatId } = await setupSeat();
    await t.run((ctx) =>
      ctx.db.insert("holds", {
        seatId,
        clientHoldId: A_CLIENT,
        expiresAt: Date.now() - 1_000,
      }),
    );
    const result = await t.query(api.holds.getMine, {
      clientHoldId: A_CLIENT,
    });
    expect(result).toBeNull();
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

    await t.run((ctx) =>
      ctx.db.insert("holds", {
        seatId: seatA!,
        clientHoldId: A_CLIENT,
        expiresAt: Date.now() + 60_000,
      }),
    );
    await t.run((ctx) =>
      ctx.db.insert("holds", {
        seatId: seatB!,
        clientHoldId: B_CLIENT,
        expiresAt: Date.now() - 60_000,
      }),
    );

    const ids = await t.query(api.holds.activeSeatIds, {});
    expect(ids).toEqual([seatA]);
  });
});

describe("holds.release", () => {
  test("removes the hold when called with the matching clientHoldId", async () => {
    const { t, seatId } = await setupSeat();
    const holdId = await t.run((ctx) =>
      _claimSeatForTest(ctx, { seatId, clientHoldId: A_CLIENT }),
    );
    await t.mutation(api.holds.release, {
      holdId,
      clientHoldId: A_CLIENT,
    });
    const holds = await t.run((ctx) => ctx.db.query("holds").collect());
    expect(holds).toHaveLength(0);
  });

  test("rejects when the clientHoldId doesn't match", async () => {
    const { t, seatId } = await setupSeat();
    const holdId = await t.run((ctx) =>
      _claimSeatForTest(ctx, { seatId, clientHoldId: A_CLIENT }),
    );
    await expect(
      t.mutation(api.holds.release, {
        holdId,
        clientHoldId: B_CLIENT,
      }),
    ).rejects.toMatchObject({ data: "forbidden" });
  });
});
