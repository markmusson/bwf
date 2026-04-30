/// <reference types="vite/client" />
// @vitest-environment edge-runtime

import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { parseAdminEmails, requireAdmin } from "./admin";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("parseAdminEmails", () => {
  test("returns an empty list for undefined / empty / whitespace", () => {
    expect(parseAdminEmails(undefined)).toEqual([]);
    expect(parseAdminEmails("")).toEqual([]);
    expect(parseAdminEmails("   ")).toEqual([]);
  });

  test("splits on commas, trims, lowercases", () => {
    expect(
      parseAdminEmails("Mark@Example.com, ADAM@bwf.org , ricky@bwf.org"),
    ).toEqual(["mark@example.com", "adam@bwf.org", "ricky@bwf.org"]);
  });

  test("ignores empty entries from trailing commas", () => {
    expect(parseAdminEmails("a@b.com,,c@d.com,")).toEqual([
      "a@b.com",
      "c@d.com",
    ]);
  });
});

describe("requireAdmin", () => {
  const originalAdminEmails = process.env.ADMIN_EMAILS;

  beforeEach(() => {
    process.env.ADMIN_EMAILS = "mark@bwf.org, ADAM@bwf.org";
  });

  afterEach(() => {
    if (originalAdminEmails === undefined) {
      delete process.env.ADMIN_EMAILS;
    } else {
      process.env.ADMIN_EMAILS = originalAdminEmails;
    }
    vi.restoreAllMocks();
  });

  test("throws unauthenticated when no user identity is present", async () => {
    const t = convexTest(schema, modules);
    await expect(t.run((ctx) => requireAdmin(ctx))).rejects.toMatchObject({
      data: "unauthenticated",
    });
  });

  test("throws forbidden when the user has no email", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run((ctx) => ctx.db.insert("users", {}));
    await expect(
      t
        .withIdentity({ subject: userId as unknown as string })
        .run((ctx) => requireAdmin(ctx)),
    ).rejects.toMatchObject({ data: "forbidden" });
  });

  test("throws forbidden for an email outside the allowlist", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run((ctx) =>
      ctx.db.insert("users", { email: "stranger@example.com" }),
    );
    await expect(
      t
        .withIdentity({ subject: userId as unknown as string })
        .run((ctx) => requireAdmin(ctx)),
    ).rejects.toMatchObject({ data: "forbidden" });
  });

  test("returns the admin context for an allowlisted email", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run((ctx) =>
      ctx.db.insert("users", { email: "mark@bwf.org" }),
    );
    const result = await t
      .withIdentity({ subject: userId as unknown as string })
      .run((ctx) => requireAdmin(ctx));
    expect(result.userId).toBe(userId);
    expect(result.email).toBe("mark@bwf.org");
  });

  test("matches case-insensitively against the allowlist", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run((ctx) =>
      ctx.db.insert("users", { email: "Adam@BWF.ORG" }),
    );
    const result = await t
      .withIdentity({ subject: userId as unknown as string })
      .run((ctx) => requireAdmin(ctx));
    expect(result.email).toBe("Adam@BWF.ORG");
  });

  test("denies everyone when ADMIN_EMAILS is unset", async () => {
    delete process.env.ADMIN_EMAILS;
    const t = convexTest(schema, modules);
    const userId = await t.run((ctx) =>
      ctx.db.insert("users", { email: "mark@bwf.org" }),
    );
    await expect(
      t
        .withIdentity({ subject: userId as unknown as string })
        .run((ctx) => requireAdmin(ctx)),
    ).rejects.toMatchObject({ data: "forbidden" });
  });
});
