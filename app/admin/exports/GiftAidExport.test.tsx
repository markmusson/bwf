import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const useQueryMock = vi.fn();
const useConvexAuthMock = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => useQueryMock(...args),
  useConvexAuth: () => useConvexAuthMock(),
}));

vi.mock("@/convex/_generated/api", () => ({
  api: { donations: { giftAidExport: "api.donations.giftAidExport" } },
}));

import { GiftAidExport } from "./GiftAidExport";

const ROWS = [
  {
    donationDate: "2026-04-29",
    email: "donor@example.com",
    displayName: "Sarah W.",
    amountPence: 2500,
    upliftPence: 625,
    stripePaymentIntentId: "pi_a",
  },
  {
    donationDate: "2026-04-30",
    email: null,
    displayName: null,
    amountPence: 1000,
    upliftPence: 250,
    stripePaymentIntentId: null,
  },
];

function arrange(opts: {
  authenticated?: boolean;
  isLoading?: boolean;
  rows?: typeof ROWS | undefined | null;
}) {
  useQueryMock.mockReset();
  useConvexAuthMock.mockReset();
  useConvexAuthMock.mockReturnValue({
    isAuthenticated: opts.authenticated ?? true,
    isLoading: opts.isLoading ?? false,
  });
  useQueryMock.mockReturnValue(opts.rows);
}

describe("GiftAidExport", () => {
  it("prompts to sign in when unauthenticated", () => {
    arrange({ authenticated: false });
    render(<GiftAidExport />);
    expect(
      screen.getByRole("heading", { name: /Sign in/i }),
    ).toBeInTheDocument();
  });

  it("renders a row count for the admin", () => {
    arrange({ rows: ROWS });
    render(<GiftAidExport />);
    expect(screen.getByText(/2 donations/i)).toBeInTheDocument();
  });

  it("renders a download button when rows are present", () => {
    arrange({ rows: ROWS });
    render(<GiftAidExport />);
    expect(
      screen.getByRole("button", { name: /Download CSV/i }),
    ).toBeInTheDocument();
  });

  it("disables the download button when there are no rows", () => {
    arrange({ rows: [] });
    render(<GiftAidExport />);
    expect(
      screen.getByRole("button", { name: /Download CSV/i }),
    ).toBeDisabled();
  });

  it("clicking download triggers a CSV blob download", async () => {
    arrange({ rows: ROWS });
    const user = userEvent.setup();

    const createObjectURL = vi.fn(() => "blob:test");
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectURL,
    });

    render(<GiftAidExport />);
    await user.click(screen.getByRole("button", { name: /Download CSV/i }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const arg = (createObjectURL.mock.calls[0] as unknown[] | undefined)?.[0];
    expect(arg).toBeInstanceOf(Blob);
    const blob = arg as Blob;
    expect(blob.type).toBe("text/csv;charset=utf-8");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:test");
  });
});
