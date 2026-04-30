/// <reference types="vite/client" />
// @vitest-environment edge-runtime

import { describe, expect, test } from "vitest";
import { parseAdminEmails } from "./admin";

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
