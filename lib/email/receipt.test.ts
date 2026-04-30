import { describe, expect, it } from "vitest";
import { formatReceipt } from "./receipt";

const BASE_DONATION = {
  amountPence: 2500,
  giftAid: false,
  hideName: false,
  displayName: "Sarah Williams",
};

describe("formatReceipt", () => {
  it("greets the donor by name when one is supplied", () => {
    const out = formatReceipt(BASE_DONATION, {
      email: "donor@example.com",
      name: "Sarah Williams",
    });
    expect(out.html).toContain("Dear Sarah Williams");
    expect(out.text).toContain("Hello Sarah Williams");
  });

  it("falls back to Hello when no name is supplied", () => {
    const out = formatReceipt(BASE_DONATION, { email: "donor@example.com" });
    expect(out.html).toContain("Hello,");
    expect(out.text).toMatch(/^Hello,/);
  });

  it("renders the donation amount with no Gift Aid block when off", () => {
    const out = formatReceipt(BASE_DONATION, { email: "donor@example.com" });
    expect(out.html).toContain("£25.00");
    expect(out.html).not.toContain("Gift Aid uplift");
    expect(out.text).not.toContain("Gift Aid uplift");
  });

  it("includes the £6.25 uplift on a £25 Gift Aid donation", () => {
    const out = formatReceipt(
      {
        ...BASE_DONATION,
        giftAid: true,
        giftAidConfirmations: { declaredAt: 0 },
      },
      { email: "donor@example.com" },
    );
    expect(out.html).toContain("Gift Aid uplift");
    expect(out.html).toContain("£6.25");
    expect(out.html).toContain("£31.25");
  });

  it("uses Anonymous on the seat line when hideName is true", () => {
    const out = formatReceipt(
      { ...BASE_DONATION, hideName: true },
      { email: "donor@example.com" },
    );
    expect(out.html).toContain("Anonymous");
    expect(out.html).not.toContain("Sarah Williams");
  });

  it("escapes HTML in the donor's name", () => {
    const out = formatReceipt(BASE_DONATION, {
      email: "donor@example.com",
      name: "<script>alert('x')</script>",
    });
    expect(out.html).not.toContain("<script>");
    expect(out.html).toContain("&lt;script&gt;");
  });

  it("includes the locked charity number 1185346 in the footer", () => {
    const out = formatReceipt(BASE_DONATION, { email: "donor@example.com" });
    expect(out.html).toContain("1185346");
    expect(out.text).toContain("1185346");
  });

  it("includes the postal entry address from 06-locked-from-adam.md", () => {
    const out = formatReceipt(BASE_DONATION, { email: "donor@example.com" });
    expect(out.html).toContain("Stafford House");
    expect(out.text).toContain("Dorchester");
  });
});
