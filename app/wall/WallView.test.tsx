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

const HOLLIES_GROUP = {
  seatId: "s_1",
  seat: { stand: "hollies", row: 2, num: 11, slug: "hollies-3-12" },
  donors: 2,
  raisedPence: 5000,
  latestAt: 200,
  tributes: [
    {
      tributeId: "t_2",
      text: "Bob was a hero of mine.",
      createdAt: 200,
      displayName: "John D.",
    },
    {
      tributeId: "t_1",
      text: "For my dad — Bob's legacy lives on.",
      createdAt: 100,
      displayName: "Sarah W.",
    },
  ],
};

const WYATT_GROUP = {
  seatId: "s_2",
  seat: { stand: "wyatt", row: 0, num: 4, slug: "wyatt-1-5" },
  donors: 1,
  raisedPence: 1000,
  latestAt: 150,
  tributes: [
    {
      tributeId: "t_3",
      text: "Best fast bowler England ever produced.",
      createdAt: 150,
      displayName: null,
    },
  ],
};

const SAMPLE = [HOLLIES_GROUP, WYATT_GROUP];

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

  it("renders one card per seat with all approved tributes nested", () => {
    useQueryMock.mockReset();
    useQueryMock.mockReturnValue(SAMPLE);
    render(<WallView />);
    const holliesCard = screen.getByTestId("seat-group-s_1");
    expect(holliesCard).toHaveTextContent(
      /Eric Hollies Stand · Row 3, Seat 12/,
    );
    expect(holliesCard).toHaveTextContent(/2 donors/);
    expect(holliesCard).toHaveTextContent(/2 tributes/);
    expect(holliesCard).toHaveTextContent("John D.");
    expect(holliesCard).toHaveTextContent("Sarah W.");

    const wyattCard = screen.getByTestId("seat-group-s_2");
    expect(wyattCard).toHaveTextContent(/Wyatt Stand · Row 1, Seat 5/);
    expect(wyattCard).toHaveTextContent("Anonymous");
  });

  it("links every seat header to /seat/<slug>", () => {
    useQueryMock.mockReset();
    useQueryMock.mockReturnValue(SAMPLE);
    render(<WallView />);
    expect(
      screen.getByRole("link", { name: /Eric Hollies Stand · Row 3, Seat 12/ }),
    ).toHaveAttribute("href", "/seat/hollies-3-12");
  });

  it("filters by search term across text, display name, and stand id", async () => {
    useQueryMock.mockReset();
    useQueryMock.mockReturnValue(SAMPLE);
    const user = userEvent.setup();
    render(<WallView />);

    const search = screen.getByLabelText(/Search/i);
    await user.type(search, "wyatt");
    expect(screen.queryByTestId("seat-group-s_1")).not.toBeInTheDocument();
    expect(screen.getByTestId("seat-group-s_2")).toBeInTheDocument();

    await user.clear(search);
    await user.type(search, "sarah");
    expect(screen.getByTestId("seat-group-s_1")).toBeInTheDocument();
    expect(screen.queryByTestId("seat-group-s_2")).not.toBeInTheDocument();
  });
});
