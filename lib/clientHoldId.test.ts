import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getOrCreateClientHoldId } from "./clientHoldId";

describe("getOrCreateClientHoldId", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("creates and persists a UUID on first call", () => {
    const id = getOrCreateClientHoldId();
    expect(id.length).toBeGreaterThanOrEqual(16);
    expect(window.localStorage.getItem("bwf:clientHoldId:v1")).toBe(id);
  });

  it("returns the same id on subsequent calls", () => {
    const a = getOrCreateClientHoldId();
    const b = getOrCreateClientHoldId();
    expect(a).toBe(b);
  });

  it("regenerates if the stored value is too short", () => {
    window.localStorage.setItem("bwf:clientHoldId:v1", "x");
    const fresh = getOrCreateClientHoldId();
    expect(fresh.length).toBeGreaterThanOrEqual(16);
  });
});
