import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DonateForm, validateDonateForm } from "./DonateForm";
import { EMPTY_GIFT_AID_VALUE } from "../donate/StepGiftAid";
import { EMPTY_STEP_TRIBUTE } from "../donate/StepTribute";
import {
  recordMarketingChoice,
  UNANSWERED_MARKETING_CONSENT,
} from "@/lib/donation/marketingConsent";

describe("validateDonateForm", () => {
  const base = {
    amountPence: 1000,
    donorName: "Sarah Williams",
    giftAid: EMPTY_GIFT_AID_VALUE,
    tribute: EMPTY_STEP_TRIBUTE,
    marketing: recordMarketingChoice(true, 0),
  };

  it("accepts a complete form with marketing answered and Gift Aid off", () => {
    expect(validateDonateForm(base)).toEqual([]);
  });

  it("flags an empty donor name", () => {
    const errors = validateDonateForm({ ...base, donorName: "  " });
    expect(errors.map((e) => e.field)).toContain("donorName");
  });

  it("flags missing marketing consent", () => {
    const errors = validateDonateForm({
      ...base,
      marketing: UNANSWERED_MARKETING_CONSENT,
    });
    expect(errors.map((e) => e.field)).toContain("marketing");
  });

  it("flags Gift Aid enabled but not all declarations ticked", () => {
    const errors = validateDonateForm({
      ...base,
      giftAid: {
        enabled: true,
        confirmations: { ukTaxpayer: true, ownMoney: false, noBenefit: false },
      },
    });
    expect(errors.map((e) => e.field)).toContain("giftAid");
  });

  it("accepts Gift Aid disabled regardless of confirmations", () => {
    expect(
      validateDonateForm({ ...base, giftAid: EMPTY_GIFT_AID_VALUE }),
    ).toEqual([]);
  });
});

describe("DonateForm", () => {
  it("blocks Continue and surfaces errors when required fields are missing", async () => {
    const onContinue = vi.fn();
    const user = userEvent.setup();
    render(<DonateForm onContinue={onContinue} onCancel={() => undefined} />);

    await user.click(
      screen.getByRole("button", { name: /Donate.{0,5}turn my seat blue/i }),
    );

    expect(onContinue).not.toHaveBeenCalled();
    const alerts = screen.getAllByRole("alert");
    expect(
      alerts.some((el) =>
        /name to put on your seat/i.test(el.textContent ?? ""),
      ),
    ).toBe(true);
    expect(
      alerts.some((el) => /contact preference/i.test(el.textContent ?? "")),
    ).toBe(true);
  });

  it("calls onContinue with the collected payload when valid", async () => {
    const onContinue = vi.fn();
    const user = userEvent.setup();
    render(<DonateForm onContinue={onContinue} onCancel={() => undefined} />);

    await user.type(screen.getByLabelText("Your name"), "Sarah Williams");
    await user.click(screen.getByLabelText(/happy to be contacted/i));
    await user.click(screen.getByLabelText("£25.00"));
    await user.click(
      screen.getByRole("button", { name: /Donate.{0,5}turn my seat blue/i }),
    );

    expect(onContinue).toHaveBeenCalledTimes(1);
    const value = onContinue.mock.calls[0]![0];
    expect(value.donorName).toBe("Sarah Williams");
    expect(value.amountPence).toBe(2500);
    expect(value.marketing.state).toBe("opted-in");
  });

  it("invokes onCancel when the donor backs out", async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(<DonateForm onContinue={() => undefined} onCancel={onCancel} />);
    await user.click(screen.getByRole("button", { name: /Cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
