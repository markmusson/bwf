import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const useQueryMock = vi.fn();
const useMutationMock = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => useQueryMock(...args),
  useMutation: (...args: unknown[]) => useMutationMock(...args),
}));

vi.mock("@/convex/_generated/api", () => ({
  api: {
    donations: { getBySession: "api.donations.getBySession" },
    prizeDraw: {
      isEntered: "api.prizeDraw.isEntered",
      optIn: "api.prizeDraw.optIn",
    },
  },
}));

import { ConfirmationOverlay } from "./ConfirmationOverlay";

const PAID_DONATION = {
  _id: "d_1",
  _creationTime: 0,
  userId: "u_1",
  seatId: "s_1",
  amountPence: 2500,
  currency: "GBP" as const,
  giftAid: false,
  hideName: false,
  hideAmount: false,
  stripeSessionId: "cs_test",
  status: "paid" as const,
};

function arrange(opts: {
  donation?: unknown;
  isEntered?: boolean | undefined;
  optInBehaviour?: "ok" | "fail";
}) {
  useQueryMock.mockReset();
  useMutationMock.mockReset();
  const { donation, isEntered = false, optInBehaviour = "ok" } = opts;

  useQueryMock.mockImplementation((ref: unknown) => {
    if (ref === "api.donations.getBySession") return donation;
    if (ref === "api.prizeDraw.isEntered") return isEntered;
    return undefined;
  });

  const optIn = vi.fn(async () => {
    if (optInBehaviour === "fail") throw new Error("Boom");
    return { entryId: "e_1", alreadyEntered: false };
  });
  useMutationMock.mockReturnValue(optIn);
  return { optIn };
}

describe("ConfirmationOverlay", () => {
  it("renders nothing when sessionId is null", () => {
    arrange({ donation: undefined });
    render(<ConfirmationOverlay sessionId={null} onClose={() => undefined} />);
    expect(
      screen.queryByTestId("confirmation-overlay"),
    ).not.toBeInTheDocument();
  });

  it("shows the loading state while the donation query is in-flight", () => {
    arrange({ donation: undefined });
    render(
      <ConfirmationOverlay sessionId="cs_test" onClose={() => undefined} />,
    );
    expect(screen.getByTestId("confirm-loading")).toBeInTheDocument();
  });

  it("shows a friendly miss when the donation lookup returns null", () => {
    arrange({ donation: null });
    render(
      <ConfirmationOverlay sessionId="cs_test" onClose={() => undefined} />,
    );
    expect(
      screen.getByRole("heading", {
        name: /We couldn't find that donation/i,
      }),
    ).toBeInTheDocument();
  });

  it("shows processing copy while the donation is still pending", () => {
    arrange({ donation: { ...PAID_DONATION, status: "pending" as const } });
    render(
      <ConfirmationOverlay sessionId="cs_test" onClose={() => undefined} />,
    );
    expect(
      screen.getByRole("heading", { name: /Processing your donation/i }),
    ).toBeInTheDocument();
  });

  it("renders the thank-you with formatted amount when paid", () => {
    arrange({ donation: PAID_DONATION });
    render(
      <ConfirmationOverlay sessionId="cs_test" onClose={() => undefined} />,
    );
    expect(
      screen.getByRole("heading", { name: /Seat is blue/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("£25.00")).toBeInTheDocument();
    expect(screen.getByTestId("prize-optin-button")).toHaveTextContent(
      /Enter the prize draw/i,
    );
  });

  it("disables the prize-draw button when already entered", () => {
    arrange({ donation: PAID_DONATION, isEntered: true });
    render(
      <ConfirmationOverlay sessionId="cs_test" onClose={() => undefined} />,
    );
    const button = screen.getByTestId("prize-optin-button");
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent(/You're entered/i);
  });

  it("calls api.prizeDraw.optIn and flips to entered on success", async () => {
    const { optIn } = arrange({ donation: PAID_DONATION });
    const user = userEvent.setup();
    render(
      <ConfirmationOverlay sessionId="cs_test" onClose={() => undefined} />,
    );

    await user.click(screen.getByTestId("prize-optin-button"));

    expect(optIn).toHaveBeenCalledWith({ donationId: PAID_DONATION._id });
    expect(
      await screen.findByText(/You're entered/i),
    ).toBeInTheDocument();
  });

  it("surfaces an error when optIn rejects", async () => {
    arrange({ donation: PAID_DONATION, optInBehaviour: "fail" });
    const user = userEvent.setup();
    render(
      <ConfirmationOverlay sessionId="cs_test" onClose={() => undefined} />,
    );
    await user.click(screen.getByTestId("prize-optin-button"));
    expect(await screen.findByRole("alert")).toHaveTextContent(/Boom/);
  });

  it("invokes onClose when the donor clicks Back to Edgbaston", async () => {
    arrange({ donation: PAID_DONATION });
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<ConfirmationOverlay sessionId="cs_test" onClose={onClose} />);
    await user.click(
      screen.getByRole("button", { name: /Back to Edgbaston/i }),
    );
    expect(onClose).toHaveBeenCalled();
  });
});
