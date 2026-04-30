import { describe, expect, it } from "vitest";
import { BWF, BWF_FOOTER_TEXT } from "./branding";

describe("branding", () => {
  it("uses the locked BWF charity number 1185346", () => {
    expect(BWF.charityNumber).toBe("1185346");
  });

  it("declares £20,000 as the fundraising target", () => {
    expect(BWF.fundraisingTargetPence).toBe(20_000_00);
  });

  it("composes the footer using charity number and administrator", () => {
    expect(BWF_FOOTER_TEXT).toContain("1185346");
    expect(BWF_FOOTER_TEXT).toContain("The Talent Fund");
  });
});
