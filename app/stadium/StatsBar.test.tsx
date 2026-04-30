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

  it("renders the four campaign stats with locale formatting", () => {
    useQueryMock.mockReset();
    useQueryMock.mockReturnValue({
      raisedPence: 1_234_500,
      seatsBlue: 412,
      supporters: 401,
      totalSeats: 1280,
    });
    render(<StatsBar />);
    expect(screen.getByText("£12,345.00")).toBeInTheDocument();
    expect(screen.getByText("412")).toBeInTheDocument();
    expect(screen.getByText("401")).toBeInTheDocument();
    expect(screen.getByText("1,280")).toBeInTheDocument();
    expect(screen.getByText("Raised")).toBeInTheDocument();
    expect(screen.getByText("Seats Blue")).toBeInTheDocument();
    expect(screen.getByText("Supporters")).toBeInTheDocument();
    expect(screen.getByText("Virtual Seats")).toBeInTheDocument();
  });
});
