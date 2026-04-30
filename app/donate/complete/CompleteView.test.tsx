import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const useQueryMock = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => useQueryMock(...args),
}));

vi.mock("@/convex/_generated/api", () => ({
  api: {
    donations: { getBySession: "api.donations.getBySession" },
  },
}));

import { CompleteView } from "./CompleteView";

const baseDonation = {
  _id: "d_1" as unknown,
  _creationTime: 0,
  userId: "u_1" as unknown,
  seatId: "s_1" as unknown,
  amountPence: 2500,
  currency: "GBP" as const,
  giftAid: false,
  hideName: false,
  hideAmount: false,
  stripeSessionId: "cs_test_xyz",
  status: "paid" as const,
};

describe("CompleteView", () => {
  it("warns when there is no session_id in the URL", () => {
    useQueryMock.mockReset();
    render(<CompleteView sessionId={undefined} />);
    expect(
      screen.getByRole("heading", { name: /Missing session id/i }),
    ).toBeInTheDocument();
  });

  it("shows a loading state while the donation query is undefined", () => {
    useQueryMock.mockReset();
    useQueryMock.mockReturnValue(undefined);
    render(<CompleteView sessionId="cs_test_xyz" />);
    expect(screen.getByTestId("loading")).toBeInTheDocument();
  });

  it("shows a friendly miss when the donation is null", () => {
    useQueryMock.mockReset();
    useQueryMock.mockReturnValue(null);
    render(<CompleteView sessionId="cs_test_xyz" />);
    expect(
      screen.getByRole("heading", {
        name: /We couldn't find that donation/i,
      }),
    ).toBeInTheDocument();
  });

  it("renders a thank-you with formatted amount and prize-draw button when paid", () => {
    useQueryMock.mockReset();
    useQueryMock.mockReturnValue(baseDonation);
    render(<CompleteView sessionId="cs_test_xyz" />);
    expect(
      screen.getByRole("heading", { name: /Thank you/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("£25.00")).toBeInTheDocument();
    expect(screen.getByTestId("prize-optin-button")).toBeInTheDocument();
  });

  it("shows processing copy while the donation is still pending", () => {
    useQueryMock.mockReset();
    useQueryMock.mockReturnValue({
      ...baseDonation,
      status: "pending" as const,
    });
    render(<CompleteView sessionId="cs_test_xyz" />);
    expect(
      screen.getByRole("heading", { name: /Processing your donation/i }),
    ).toBeInTheDocument();
  });
});
