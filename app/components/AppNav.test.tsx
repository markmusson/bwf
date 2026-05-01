import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const useConvexAuthMock = vi.fn();
const useQueryMock = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => useQueryMock(...args),
  useConvexAuth: () => useConvexAuthMock(),
}));

vi.mock("@/convex/_generated/api", () => ({
  api: { admin: { isAdmin: "api.admin.isAdmin" } },
}));

import { AppNav } from "./AppNav";

function arrange(opts: {
  authenticated?: boolean;
  isLoading?: boolean;
  isAdmin?: boolean;
}) {
  useConvexAuthMock.mockReset();
  useQueryMock.mockReset();
  useConvexAuthMock.mockReturnValue({
    isAuthenticated: opts.authenticated ?? false,
    isLoading: opts.isLoading ?? false,
  });
  useQueryMock.mockReturnValue(opts.isAdmin ?? false);
}

describe("AppNav", () => {
  it("always shows the public links: Stadium and Wall", () => {
    arrange({});
    render(<AppNav />);
    expect(screen.getByRole("link", { name: /Stadium/i })).toHaveAttribute(
      "href",
      "/stadium",
    );
    expect(screen.getByRole("link", { name: /Wall/i })).toHaveAttribute(
      "href",
      "/wall",
    );
  });

  it("hides Manage when the donor is not signed in", () => {
    arrange({ authenticated: false });
    render(<AppNav />);
    expect(screen.queryByRole("link", { name: /Manage/i })).toBeNull();
  });

  it("shows Manage when the donor is signed in", () => {
    arrange({ authenticated: true });
    render(<AppNav />);
    expect(screen.getByRole("link", { name: /Manage/i })).toHaveAttribute(
      "href",
      "/manage",
    );
  });

  it("hides Admin when the user isn't on the allowlist", () => {
    arrange({ authenticated: true, isAdmin: false });
    render(<AppNav />);
    expect(screen.queryByRole("link", { name: /Admin/i })).toBeNull();
  });

  it("shows Admin when isAdmin returns true", () => {
    arrange({ authenticated: true, isAdmin: true });
    render(<AppNav />);
    expect(screen.getByRole("link", { name: /Admin/i })).toHaveAttribute(
      "href",
      "/admin",
    );
  });
});
