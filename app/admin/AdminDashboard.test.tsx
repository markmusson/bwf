import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const useConvexAuthMock = vi.fn();
const queryReturns: Map<string, unknown> = new Map();

vi.mock("convex/react", () => ({
  useQuery: (ref: string) => queryReturns.get(ref),
  useConvexAuth: () => useConvexAuthMock(),
}));

vi.mock("@/convex/_generated/api", () => ({
  api: {
    admin: { isAdmin: "api.admin.isAdmin" },
    adminDashboard: { dashboard: "api.adminDashboard.dashboard" },
  },
}));

import { AdminDashboard } from "./AdminDashboard";

const SNAPSHOT = {
  raisedPence: 5000,
  raisedWithUpliftPence: 6250,
  paidDonations: 2,
  giftAidDonations: 1,
  seatsBlue: 7,
  totalSeats: 1280,
  tributesApproved: 4,
  tributesPending: 1,
  tributesRejected: 0,
  prizeEntries: 3,
  recentDonations: [
    {
      donationId: "d_1",
      amountPence: 2500,
      giftAid: true,
      displayName: "Sarah W.",
      createdAt: Date.parse("2026-04-29T10:00:00Z"),
      seat: { stand: "hollies", row: 2, num: 11 },
    },
  ],
  recentAuditLog: [
    {
      action: "tribute.approve",
      actorEmail: "ops@bwf.org",
      targetId: "t_1",
      at: Date.parse("2026-04-29T11:00:00Z"),
    },
  ],
};

function arrange(opts: {
  authenticated?: boolean;
  isLoading?: boolean;
  isAdmin?: boolean | undefined;
  data?: typeof SNAPSHOT | undefined;
}) {
  queryReturns.clear();
  useConvexAuthMock.mockReset();
  useConvexAuthMock.mockReturnValue({
    isAuthenticated: opts.authenticated ?? true,
    isLoading: opts.isLoading ?? false,
  });
  queryReturns.set("api.admin.isAdmin", opts.isAdmin ?? true);
  queryReturns.set("api.adminDashboard.dashboard", opts.data);
}

describe("AdminDashboard", () => {
  it("prompts to sign in when unauthenticated", () => {
    arrange({ authenticated: false });
    render(<AdminDashboard />);
    expect(
      screen.getByRole("heading", { name: /Sign in/i }),
    ).toBeInTheDocument();
  });

  it("shows a 'not authorised' message for a signed-in non-admin", () => {
    arrange({ authenticated: true, isAdmin: false });
    render(<AdminDashboard />);
    expect(
      screen.getByRole("heading", { name: /Not authorised/i }),
    ).toBeInTheDocument();
  });

  it("renders the raised total + Gift Aid uplift", () => {
    arrange({ data: SNAPSHOT });
    render(<AdminDashboard />);
    expect(screen.getByText(/£50.00 raised/)).toBeInTheDocument();
    expect(screen.getByText(/£62.50 with Gift Aid/)).toBeInTheDocument();
  });

  it("renders seats taken vs total", () => {
    arrange({ data: SNAPSHOT });
    render(<AdminDashboard />);
    expect(screen.getByText(/7 \/ 1280 seats blue/i)).toBeInTheDocument();
  });

  it("lists recent donations and audit log entries", () => {
    arrange({ data: SNAPSHOT });
    render(<AdminDashboard />);
    expect(screen.getByText(/Sarah W./)).toBeInTheDocument();
    expect(screen.getByText("tribute.approve")).toBeInTheDocument();
  });

  it("links recent donations to /seat/<slug>", () => {
    arrange({ data: SNAPSHOT });
    render(<AdminDashboard />);
    const link = screen.getByRole("link", { name: /hollies-3-12/i });
    expect(link).toHaveAttribute("href", "/seat/hollies-3-12");
  });

  it("links to the moderation queue and gift aid export", () => {
    arrange({ data: SNAPSHOT });
    render(<AdminDashboard />);
    expect(
      screen.getByRole("link", { name: /Moderation queue/i }),
    ).toHaveAttribute("href", "/admin/moderation");
    expect(
      screen.getByRole("link", { name: /Gift Aid export/i }),
    ).toHaveAttribute("href", "/admin/exports");
  });
});
