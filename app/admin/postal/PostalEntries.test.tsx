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
    prizeDraw: {
      adminListPostalEntries: "api.prizeDraw.adminListPostalEntries",
      adminAddPostalEntry: "api.prizeDraw.adminAddPostalEntry",
    },
  },
}));

import { PostalEntries } from "./PostalEntries";

const SAMPLE = [
  {
    postalEntryId: "p_1",
    name: "Sarah W.",
    address: "1 BWF Road, Birmingham B5 7QU",
    receivedAt: Date.parse("2026-04-29T10:00:00Z"),
  },
];

function arrange(opts: {
  authenticated?: boolean;
  rows?: typeof SAMPLE;
  add?: ReturnType<typeof vi.fn>;
}) {
  useQueryMock.mockReset();
  useMutationMock.mockReset();
  useConvexAuthMock.mockReset();
  useConvexAuthMock.mockReturnValue({
    isAuthenticated: opts.authenticated ?? true,
    isLoading: false,
  });
  useQueryMock.mockReturnValue(opts.rows);
  const add = opts.add ?? vi.fn().mockResolvedValue({ postalEntryId: "p_x" });
  useMutationMock.mockReturnValue(add);
  return { add };
}

describe("PostalEntries", () => {
  it("prompts to sign in when unauthenticated", () => {
    arrange({ authenticated: false });
    render(<PostalEntries />);
    expect(
      screen.getByRole("heading", { name: /Sign in/i }),
    ).toBeInTheDocument();
  });

  it("renders the existing postal entries list", () => {
    arrange({ rows: SAMPLE });
    render(<PostalEntries />);
    expect(screen.getByText("Sarah W.")).toBeInTheDocument();
    expect(screen.getByText(/1 BWF Road/)).toBeInTheDocument();
  });

  it("calls adminAddPostalEntry on submit and clears the form", async () => {
    const { add } = arrange({ rows: [] });
    const user = userEvent.setup();
    render(<PostalEntries />);

    await user.type(screen.getByLabelText(/Name/i), "Sarah W.");
    await user.type(
      screen.getByLabelText(/Address/i),
      "1 BWF Road, Birmingham",
    );
    await user.click(screen.getByRole("button", { name: /Add entry/i }));

    expect(add).toHaveBeenCalledWith({
      name: "Sarah W.",
      address: "1 BWF Road, Birmingham",
    });
  });

  it("shows an error message when adminAddPostalEntry rejects", async () => {
    const reject = vi.fn().mockRejectedValue(new Error("boom"));
    arrange({ rows: [], add: reject });
    const user = userEvent.setup();
    render(<PostalEntries />);

    await user.type(screen.getByLabelText(/Name/i), "Sarah W.");
    await user.type(screen.getByLabelText(/Address/i), "1 BWF Road");
    await user.click(screen.getByRole("button", { name: /Add entry/i }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });
});
