import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const useQueryMock = vi.fn();
const useMutationMock = vi.fn();
const useConvexAuthMock = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => useQueryMock(...args),
  useMutation: (...args: unknown[]) => useMutationMock(...args),
  useConvexAuth: () => useConvexAuthMock(),
}));

vi.mock("@/convex/_generated/api", () => ({
  api: {
    admin: { isAdmin: "api.admin.isAdmin" },
    tributes: {
      listForModeration: "api.tributes.listForModeration",
      adminApprove: "api.tributes.adminApprove",
      adminReject: "api.tributes.adminReject",
    },
  },
}));

import { ModerationQueue } from "./ModerationQueue";

const SAMPLE_ROWS = [
  {
    tributeId: "t_1",
    donationId: "d_1",
    text: "this is fucking awful",
    status: "pending",
    profanityScore: 4,
    displayName: "Anonymous",
    seat: { stand: "hollies", row: 0, num: 4 },
  },
  {
    tributeId: "t_2",
    donationId: "d_2",
    text: "spam http://example.com",
    status: "pending",
    profanityScore: 2,
    displayName: null,
    seat: null,
  },
];

function arrange(opts: {
  authenticated?: boolean;
  isLoading?: boolean;
  isAdmin?: boolean;
  tributes?: typeof SAMPLE_ROWS | undefined;
  approve?: ReturnType<typeof vi.fn>;
  reject?: ReturnType<typeof vi.fn>;
}) {
  useQueryMock.mockReset();
  useMutationMock.mockReset();
  useConvexAuthMock.mockReset();

  useConvexAuthMock.mockReturnValue({
    isAuthenticated: opts.authenticated ?? true,
    isLoading: opts.isLoading ?? false,
  });
  useQueryMock.mockImplementation((ref: unknown) => {
    if (ref === "api.admin.isAdmin") return opts.isAdmin ?? true;
    return opts.tributes;
  });

  const approve = opts.approve ?? vi.fn().mockResolvedValue({});
  const reject = opts.reject ?? vi.fn().mockResolvedValue({});
  useMutationMock.mockImplementation((ref: unknown) => {
    if (ref === "api.tributes.adminApprove") return approve;
    if (ref === "api.tributes.adminReject") return reject;
    return vi.fn();
  });
  return { approve, reject };
}

describe("ModerationQueue", () => {
  it("prompts the donor to sign in when unauthenticated", () => {
    arrange({ authenticated: false });
    render(<ModerationQueue />);
    expect(
      screen.getByRole("heading", { name: /Sign in to moderate/i }),
    ).toBeInTheDocument();
  });

  it("shows an empty state when the queue has nothing", () => {
    arrange({ tributes: [] });
    render(<ModerationQueue />);
    expect(screen.getByText(/Nothing to look at/i)).toBeInTheDocument();
  });

  it("renders the queue worst-first with seat / score / status", () => {
    arrange({ tributes: SAMPLE_ROWS });
    render(<ModerationQueue />);
    expect(screen.getByTestId("moderation-row-t_1")).toHaveTextContent(
      /Eric Hollies Stand · Row 1, Seat 5/,
    );
    expect(screen.getByTestId("moderation-row-t_1")).toHaveTextContent("4");
    expect(screen.getByTestId("moderation-row-t_2")).toHaveTextContent("2");
  });

  it("calls adminApprove on approve click", async () => {
    const { approve } = arrange({ tributes: SAMPLE_ROWS });
    const user = userEvent.setup();
    render(<ModerationQueue />);
    const row = screen.getByTestId("moderation-row-t_1");
    await user.click(
      Array.from(row.querySelectorAll("button")).find(
        (b) => b.textContent === "Approve",
      )!,
    );
    expect(approve).toHaveBeenCalledWith({ tributeId: "t_1" });
  });

  it("calls adminReject on reject click", async () => {
    const { reject } = arrange({ tributes: SAMPLE_ROWS });
    const user = userEvent.setup();
    render(<ModerationQueue />);
    const row = screen.getByTestId("moderation-row-t_2");
    await user.click(
      Array.from(row.querySelectorAll("button")).find(
        (b) => b.textContent === "Reject",
      )!,
    );
    expect(reject).toHaveBeenCalledWith({ tributeId: "t_2" });
  });
});
