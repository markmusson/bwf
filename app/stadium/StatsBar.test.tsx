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
    expect(screen.getByText("£0.00")).toBeInTheDocument();
  });

  it("renders the four campaign stats matching the live mock copy", () => {
    useQueryMock.mockReset();
    useQueryMock.mockReturnValue({
      raisedPence: 1_234_500,
      seatsBlue: 59,
      supporters: 58,
      totalSeats: 1280,
    });
    render(<StatsBar />);
    expect(screen.getByText("£12,345.00")).toBeInTheDocument();
    expect(screen.getByText("59")).toBeInTheDocument();
    expect(screen.getByText("58")).toBeInTheDocument();
    // Remaining = totalSeats - seatsBlue = 1221
    expect(screen.getByText("1,221")).toBeInTheDocument();
    expect(screen.getByText("Raised")).toBeInTheDocument();
    expect(screen.getByText("Seats Turned Blue")).toBeInTheDocument();
    expect(screen.getByText("Supporters")).toBeInTheDocument();
    expect(screen.getByText("Remaining Seats")).toBeInTheDocument();
  });

  it("never shows a negative remaining count", () => {
    useQueryMock.mockReset();
    useQueryMock.mockReturnValue({
      raisedPence: 0,
      seatsBlue: 100,
      supporters: 0,
      totalSeats: 50,
    });
    const { container } = render(<StatsBar />);
    // Pull the four stat cells; the last one is "Remaining Seats".
    const cells = container.querySelectorAll(
      '[aria-label="Campaign statistics"] > div > div',
    );
    const remainingCell = cells[cells.length - 1];
    expect(remainingCell?.textContent).toContain("0");
    expect(remainingCell?.textContent).toContain("Remaining Seats");
  });
});
