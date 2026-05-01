import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const useQueryMock = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => useQueryMock(...args),
}));

vi.mock("@/convex/_generated/api", () => ({
  api: { donations: { aggregateStats: "api.donations.aggregateStats" } },
}));

import { StatsBar } from "./StatsBar";

describe("StatsBar", () => {
  it("subscribes to api.donations.aggregateStats", () => {
    useQueryMock.mockReset();
    useQueryMock.mockReturnValue(undefined);
    render(<StatsBar />);
    expect(useQueryMock).toHaveBeenCalledWith("api.donations.aggregateStats");
  });

  it("shows zeroes while the query is loading", () => {
    useQueryMock.mockReset();
    useQueryMock.mockReturnValue(undefined);
    render(<StatsBar />);
    expect(screen.getByTestId("stats-bar")).toHaveAttribute(
      "data-loading",
      "true",
    );
    expect(screen.getByText(/Raised/i)).toBeInTheDocument();
    expect(screen.getByText("£0")).toBeInTheDocument();
  });

  it("renders the four mock stats: Raised / Seats Blue / Supporters / Virtual Seats", () => {
    useQueryMock.mockReset();
    useQueryMock.mockReturnValue({
      raisedPence: 1_234_500,
      seatsBlue: 59,
      supporters: 58,
      totalSeats: 1280,
    });
    render(<StatsBar />);
    expect(screen.getByText("£12,345")).toBeInTheDocument();
    expect(screen.getByText("59")).toBeInTheDocument();
    expect(screen.getByText("58")).toBeInTheDocument();
    expect(screen.getByText("1,280")).toBeInTheDocument();
    expect(screen.getByText("Raised")).toBeInTheDocument();
    expect(screen.getByText("Seats Blue")).toBeInTheDocument();
    expect(screen.getByText("Supporters")).toBeInTheDocument();
    expect(screen.getByText("Virtual Seats")).toBeInTheDocument();
  });

  it("renders a single-row 4-column grid with all four cells flush", () => {
    useQueryMock.mockReset();
    useQueryMock.mockReturnValue({
      raisedPence: 0,
      seatsBlue: 0,
      supporters: 0,
      totalSeats: 1280,
    });
    const { container } = render(<StatsBar />);
    const grid = container.querySelector('[data-testid="stats-grid"]');
    expect(grid?.className).toMatch(/grid-cols-4/);
    expect(grid?.children.length).toBe(4);
  });

  it("draws hairline vertical dividers between cells", () => {
    useQueryMock.mockReset();
    useQueryMock.mockReturnValue({
      raisedPence: 0,
      seatsBlue: 0,
      supporters: 0,
      totalSeats: 1280,
    });
    const { container } = render(<StatsBar />);
    const grid = container.querySelector('[data-testid="stats-grid"]');
    const cells = Array.from(grid?.children ?? []) as HTMLElement[];
    // First cell: no left border. Cells 2-4: border-l.
    expect(cells[0]?.className).not.toMatch(/border-l/);
    for (const c of cells.slice(1)) {
      expect(c.className).toMatch(/border-l/);
    }
  });

  it("does not duplicate the progress bar with a % claimed sublabel", () => {
    useQueryMock.mockReset();
    useQueryMock.mockReturnValue({
      raisedPence: 0,
      seatsBlue: 320,
      supporters: 320,
      totalSeats: 1280,
    });
    render(<StatsBar />);
    expect(screen.queryByTestId("stats-pct")).toBeNull();
    expect(screen.queryByText(/claimed/i)).toBeNull();
  });
});
