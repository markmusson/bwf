/// <reference types="vite/client" />
// @vitest-environment edge-runtime

import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { _optInForTest, _runDrawForTest, pickWinnerIndex } from "./prizeDraw";
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

describe("prizeDraw.pickWinnerIndex", () => {
  test("seed all-zero hex picks index 0", () => {
    expect(pickWinnerIndex("0".repeat(64), 100)).toBe(0);
  });

  test("returns a stable index for a given (seed, count) pair", () => {
    const seed = "deadbeef".repeat(8);
    const a = pickWinnerIndex(seed, 17);
    const b = pickWinnerIndex(seed, 17);
    expect(a).toBe(b);
  });

  test("always returns an index inside [0, count)", () => {
    for (let count = 1; count < 50; count++) {
      const seed = (count.toString(16).padStart(8, "0") + "abcd1234").padEnd(
        64,
        "0",
      );
      const idx = pickWinnerIndex(seed, count);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(count);
    }
  });

  test("rejects a non-hex seed", () => {
    expect(() => pickWinnerIndex("zzz", 5)).toThrow();
  });

  test("rejects a count of zero", () => {
    expect(() => pickWinnerIndex("0".repeat(64), 0)).toThrow();
  });
});

async function setupDraw(opts?: { admins?: number; entries?: number }) {
  const t = convexTest(schema, modules);
  const adminCount = opts?.admins ?? 1;
  const entryCount = opts?.entries ?? 3;
  const admins: { id: string }[] = [];
  for (let i = 0; i < adminCount; i++) {
    const id = await t.run((ctx) =>
      ctx.db.insert("users", { email: `admin${i}@bwf.org` }),
    );
    admins.push({ id });
  }
  const entries: { id: string; donationId: string; userId: string }[] = [];
  for (let i = 0; i < entryCount; i++) {
    const userId = await t.run((ctx) =>
      ctx.db.insert("users", { email: `donor${i}@bwf.org` }),
    );
    const donationId = await t.run((ctx) =>
      ctx.db.insert("donations", {
        userId,
        amountPence: 1000,
        currency: "GBP" as const,
        giftAid: false,
        hideName: false,
        hideAmount: false,
        stripeSessionId: `cs_${i}`,
        status: "paid" as const,
      }),
    );
    const entryId = await t.run((ctx) =>
      ctx.db.insert("prizeEntries", {
        donationId,
        userId,
        method: "online" as const,
      }),
    );
    entries.push({
      id: entryId as unknown as string,
      donationId: donationId as unknown as string,
      userId: userId as unknown as string,
    });
  }
  return { t, admins, entries };
}

describe("prizeDraw.runDraw", () => {
  test("picks a winner deterministically from a fixed seed", async () => {
    const { t, admins, entries } = await setupDraw({ entries: 5 });
    const result = await t.run((ctx) =>
      _runDrawForTest(ctx, {
        drawName: "2026-bwf-prize",
        seed: "0".repeat(64),
        runByUserId: admins[0]!.id as never,
      }),
    );
    expect(result.entryCount).toBe(5);
    expect(result.winnerEntryId).toBe(entries[0]!.id);
  });

  test("is idempotent — re-running with the same drawName returns the same record", async () => {
    const { t, admins } = await setupDraw({ entries: 4 });
    const first = await t.run((ctx) =>
      _runDrawForTest(ctx, {
        drawName: "2026-bwf-prize",
        seed: "1".repeat(64),
        runByUserId: admins[0]!.id as never,
      }),
    );
    const second = await t.run((ctx) =>
      _runDrawForTest(ctx, {
        drawName: "2026-bwf-prize",
        seed: "ffffffff".repeat(8),
        runByUserId: admins[0]!.id as never,
      }),
    );
    expect(second.drawId).toBe(first.drawId);
    expect(second.alreadyRun).toBe(true);
    expect(second.seed).toBe(first.seed);
    expect(second.winnerEntryId).toBe(first.winnerEntryId);
    const draws = await t.run((ctx) => ctx.db.query("prizeDraws").collect());
    expect(draws).toHaveLength(1);
  });

  test("snapshots all entry ids in sorted order for audit", async () => {
    const { t, admins, entries } = await setupDraw({ entries: 3 });
    const result = await t.run((ctx) =>
      _runDrawForTest(ctx, {
        drawName: "snap",
        seed: "0".repeat(64),
        runByUserId: admins[0]!.id as never,
      }),
    );
    const sorted = entries.map((e) => e.id).sort();
    expect(result.entryIds).toEqual(sorted);
  });

  test("throws no_entries when there are zero prize entries", async () => {
    const { t, admins } = await setupDraw({ entries: 0 });
    await expect(
      t.run((ctx) =>
        _runDrawForTest(ctx, {
          drawName: "empty",
          seed: "0".repeat(64),
          runByUserId: admins[0]!.id as never,
        }),
      ),
    ).rejects.toMatchObject({ data: "no_entries" });
  });
});
