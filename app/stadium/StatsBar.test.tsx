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

  it("renders a percentage-claimed sublabel in a subtle blue tone", () => {
    useQueryMock.mockReset();
    useQueryMock.mockReturnValue({
      raisedPence: 0,
      seatsBlue: 320,
      supporters: 320,
      totalSeats: 1280,
    });
    render(<StatsBar />);
    const pct = screen.getByTestId("stats-pct");
    expect(pct.textContent).toContain("25%");
    expect(pct.textContent).toMatch(/claimed/i);
    expect(pct.className).toMatch(/text-bwf-blue-light/);
  });

  it("renders 0% claimed when totalSeats is zero", () => {
    useQueryMock.mockReset();
    useQueryMock.mockReturnValue({
      raisedPence: 0,
      seatsBlue: 0,
      supporters: 0,
      totalSeats: 0,
    });
    render(<StatsBar />);
    expect(screen.getByTestId("stats-pct").textContent).toContain("0%");
  });
});
