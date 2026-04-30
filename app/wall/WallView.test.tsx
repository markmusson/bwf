import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const useQueryMock = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => useQueryMock(...args),
}));

vi.mock("@/convex/_generated/api", () => ({
  api: { tributes: { listApproved: "api.tributes.listApproved" } },
}));

import { WallView } from "./WallView";

const SAMPLE = [
  {
    tributeId: "t_1",
    text: "For my dad — Bob's legacy lives on.",
    createdAt: 0,
    displayName: "Sarah W.",
    seat: { stand: "hollies", row: 3, num: 12 },
  },
  {
    tributeId: "t_2",
    text: "Best fast bowler England ever produced.",
    createdAt: 0,
    displayName: null,
    seat: { stand: "wyatt", row: 0, num: 5 },
  },
];

describe("WallView", () => {
  it("subscribes to api.tributes.listApproved", () => {
    useQueryMock.mockReset();
    useQueryMock.mockReturnValue([]);
    render(<WallView />);
    expect(useQueryMock).toHaveBeenCalledWith("api.tributes.listApproved");
  });

  it("shows the loading state while the query is undefined", () => {
    useQueryMock.mockReset();
    useQueryMock.mockReturnValue(undefined);
    render(<WallView />);
    expect(screen.getByTestId("wall-loading")).toBeInTheDocument();
  });

  it("renders empty-state copy when nothing has been approved yet", () => {
    useQueryMock.mockReset();
    useQueryMock.mockReturnValue([]);
    render(<WallView />);
    expect(
      screen.getByText(/No tributes have been published yet/i),
    ).toBeInTheDocument();
  });

  it("renders each tribute with display name (or Anonymous) and seat label", () => {
    useQueryMock.mockReset();
    useQueryMock.mockReturnValue(SAMPLE);
    render(<WallView />);
    expect(screen.getByTestId("tribute-t_1")).toHaveTextContent("Sarah W.");
    expect(screen.getByTestId("tribute-t_1")).toHaveTextContent(
      /Eric Hollies Stand · Row 4, Seat 13/,
    );
    expect(screen.getByTestId("tribute-t_2")).toHaveTextContent("Anonymous");
    expect(screen.getByTestId("tribute-t_2")).toHaveTextContent(
      /Wyatt Stand · Row 1, Seat 6/,
    );
  });

  it("filters by search term across text, display name, and stand id", async () => {
    useQueryMock.mockReset();
    useQueryMock.mockReturnValue(SAMPLE);
    const user = userEvent.setup();
    render(<WallView />);

    const search = screen.getByLabelText(/Search/i);
    await user.type(search, "wyatt");
    expect(screen.queryByTestId("tribute-t_1")).not.toBeInTheDocument();
    expect(screen.getByTestId("tribute-t_2")).toBeInTheDocument();

    await user.clear(search);
    await user.type(search, "sarah");
    expect(screen.getByTestId("tribute-t_1")).toBeInTheDocument();
    expect(screen.queryByTestId("tribute-t_2")).not.toBeInTheDocument();
  });
});
