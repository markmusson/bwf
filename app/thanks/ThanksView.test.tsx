import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const useQueryMock = vi.fn();
const useSearchParamsMock = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => useQueryMock(...args),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => useSearchParamsMock(),
}));

vi.mock("@/convex/_generated/api", () => ({
  api: {
    donations: { getThanksBySession: "api.donations.getThanksBySession" },
  },
}));

import { ThanksView } from "./ThanksView";

function arrange(opts: { sessionId?: string | null; data?: unknown }) {
  useQueryMock.mockReset();
  useSearchParamsMock.mockReset();
  const params = new URLSearchParams();
  if (opts.sessionId) params.set("session_id", opts.sessionId);
  useSearchParamsMock.mockReturnValue({
    get: (k: string) => params.get(k),
  });
  useQueryMock.mockReturnValue(opts.data);
}

describe("ThanksView", () => {
  it("shows a 'no session' state when the redirect lost session_id", () => {
    arrange({ sessionId: null });
    render(<ThanksView />);
    expect(
      screen.getByText(/Couldn't find your donation/i),
    ).toBeInTheDocument();
  });

  it("shows a waiting state while the webhook is still processing", () => {
    arrange({ sessionId: "cs_x", data: null });
    render(<ThanksView />);
    expect(
      screen.getByText(/Confirming your payment with Stripe/i),
    ).toBeInTheDocument();
  });

  it("shows the mock-style 'Seat is blue!' confirmation with a Bob Willis line", () => {
    arrange({
      sessionId: "cs_x",
      data: {
        donationId: "d_1",
        amountPence: 2500,
        giftAid: true,
        displayName: "Sarah W.",
        seat: { stand: "wyatt", row: 2, num: 4, slug: "wyatt-3-5" },
        tribute: { text: "For Bob.", status: "approved" },
      },
    });
    render(<ThanksView />);
    expect(
      screen.getByRole("heading", { name: /Thank you for taking your Blue Seat/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Your Blue Seat has been secured/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/£25/)).toBeInTheDocument();
    expect(screen.getByText(/Gift Aid/i)).toBeInTheDocument();
    // Replaced single "Share this seat" link with platform share row
    // (X/LinkedIn/WhatsApp/Facebook/Email + Download + Copy).
    expect(
      screen.getByRole("region", { name: /share your seat/i }),
    ).toBeInTheDocument();
    const twitterLink = screen.getByRole("link", { name: /^X \(Twitter\)$/i });
    // URL-encoded inside the Twitter intent: /seat/wyatt-3-5 -> %2Fseat%2Fwyatt-3-5
    expect(twitterLink.getAttribute("href")).toContain("seat%2Fwyatt-3-5");
  });

  it("notes when the tribute is still in moderation", () => {
    arrange({
      sessionId: "cs_x",
      data: {
        donationId: "d_1",
        amountPence: 1000,
        giftAid: false,
        displayName: null,
        seat: { stand: "hollies", row: 0, num: 0, slug: "hollies-1-1" },
        tribute: { text: "spam", status: "pending" },
      },
    });
    render(<ThanksView />);
    expect(screen.getByText(/tribute is being reviewed/i)).toBeInTheDocument();
  });

  it("renders the seat-is-blue confirmation when the donor hid their name", () => {
    arrange({
      sessionId: "cs_x",
      data: {
        donationId: "d_1",
        amountPence: 1000,
        giftAid: false,
        displayName: null,
        seat: { stand: "wyatt", row: 0, num: 0, slug: "wyatt-1-1" },
        tribute: null,
      },
    });
    render(<ThanksView />);
    expect(
      screen.getByRole("heading", { name: /Thank you for taking your Blue Seat/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Anonymous/i)).toBeInTheDocument();
  });
});
