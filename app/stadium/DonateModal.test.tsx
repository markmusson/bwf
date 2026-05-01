import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const useActionMock = vi.fn();

vi.mock("convex/react", () => ({
  useAction: (...args: unknown[]) => useActionMock(...args),
}));

vi.mock("@/convex/_generated/api", () => ({
  api: { stripe: { createSession: "api.stripe.createSession" } },
}));

vi.mock("@stripe/react-stripe-js", () => ({
  EmbeddedCheckoutProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="stripe-provider">{children}</div>
  ),
  EmbeddedCheckout: () => <div data-testid="stripe-checkout" />,
}));

vi.mock("@stripe/stripe-js", () => ({
  loadStripe: () => Promise.resolve({}),
}));

import { DonateModal } from "./DonateModal";

describe("DonateModal", () => {
  it("renders nothing when seatId is null", () => {
    render(
      <DonateModal seatId={null} seatLabel={null} onClose={() => undefined} />,
    );
    expect(screen.queryByTestId("donate-modal")).not.toBeInTheDocument();
  });

  it("opens with the donate form when a seatId is provided", () => {
    useActionMock.mockReset();
    useActionMock.mockReturnValue(vi.fn());
    render(
      <DonateModal
        seatId={"seat_1" as unknown as never}
        seatLabel="Eric Hollies Stand · Row 1, Seat 1"
        onClose={() => undefined}
      />,
    );
    expect(screen.getByTestId("donate-modal")).toBeInTheDocument();
    expect(
      screen.getByText("Eric Hollies Stand · Row 1, Seat 1"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Your name")).toBeInTheDocument();
  });

  it("transitions to the payment phase after a valid form submit", async () => {
    vi.stubEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "pk_test");
    useActionMock.mockReset();
    const createSession = vi
      .fn()
      .mockResolvedValue({ clientSecret: "cs_test", donationId: "d1" });
    useActionMock.mockReturnValue(createSession);

    const user = userEvent.setup();
    render(
      <DonateModal
        seatId={"seat_1" as unknown as never}
        seatLabel="Hollies"
        onClose={() => undefined}
      />,
    );

    await user.type(screen.getByLabelText("Your name"), "Sarah Williams");
    await user.click(screen.getByLabelText(/happy to be contacted/i));
    await user.click(screen.getByLabelText("£25.00"));
    await user.click(
      screen.getByRole("button", { name: /Donate.{0,5}turn my seat blue/i }),
    );

    expect(
      await screen.findByRole("heading", { name: /Pay securely/i }),
    ).toBeInTheDocument();
    expect(createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        seatId: "seat_1",
        amountPence: 2500,
        displayName: "Sarah Williams",
        marketingOptIn: true,
      }),
    );
    vi.unstubAllEnvs();
  });

  it("invokes onClose when the donor presses Escape", async () => {
    useActionMock.mockReset();
    useActionMock.mockReturnValue(vi.fn());
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <DonateModal
        seatId={"seat_1" as unknown as never}
        seatLabel="Hollies"
        onClose={onClose}
      />,
    );
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });
});
