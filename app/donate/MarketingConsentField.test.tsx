import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MarketingConsentField } from "./MarketingConsentField";
import { UNANSWERED_MARKETING_CONSENT } from "@/lib/donation/marketingConsent";

describe("MarketingConsentField", () => {
  it("renders both radios with neither pre-selected", () => {
    render(
      <MarketingConsentField
        value={UNANSWERED_MARKETING_CONSENT}
        onChange={() => undefined}
      />,
    );
    const optIn = screen.getByLabelText(/happy to be contacted/i);
    const optOut = screen.getByLabelText(/please don't contact me/i);
    expect(optIn).not.toBeChecked();
    expect(optOut).not.toBeChecked();
  });

  it("emits an opt-in record with a timestamp when the donor picks yes", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <MarketingConsentField
        value={UNANSWERED_MARKETING_CONSENT}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByLabelText(/happy to be contacted/i));

    expect(onChange).toHaveBeenCalledTimes(1);
    const argument = onChange.mock.calls[0]![0];
    expect(argument.state).toBe("opted-in");
    expect(typeof argument.recordedAt).toBe("number");
  });

  it("emits an opt-out record with a timestamp when the donor picks no", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <MarketingConsentField
        value={UNANSWERED_MARKETING_CONSENT}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByLabelText(/please don't contact me/i));

    const argument = onChange.mock.calls[0]![0];
    expect(argument.state).toBe("opted-out");
    expect(typeof argument.recordedAt).toBe("number");
  });

  it("hides the error message until showError is true", () => {
    const { rerender } = render(
      <MarketingConsentField
        value={UNANSWERED_MARKETING_CONSENT}
        onChange={() => undefined}
      />,
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    rerender(
      <MarketingConsentField
        value={UNANSWERED_MARKETING_CONSENT}
        onChange={() => undefined}
        showError
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      /Please select a contact preference/i,
    );
  });

  it("hides the error once the donor has answered", () => {
    render(
      <MarketingConsentField
        value={{ state: "opted-in", recordedAt: 1714500000000 }}
        onChange={() => undefined}
        showError
      />,
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/happy to be contacted/i)).toBeChecked();
  });
});
