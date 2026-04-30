import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const useQueryMock = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => useQueryMock(...args),
}));

vi.mock("@/convex/_generated/api", () => ({
  api: { donations: { aggregateStats: "api.donations.aggregateStats" } },
}));

import { ProgressBar } from "./ProgressBar";

describe("ProgressBar", () => {
  it("renders 0% with the call-to-action while no donations exist", () => {
    useQueryMock.mockReset();
    useQueryMock.mockReturnValue({
      raisedPence: 0,
      seatsBlue: 0,
      supporters: 0,
      totalSeats: 0,
    });
    render(<ProgressBar />);
    expect(screen.getByText(/Help turn Edgbaston blue/i)).toBeInTheDocument();
    const fill = screen.getByTestId("progress-fill");
    expect(fill).toHaveStyle({ width: "0%" });
    expect(
      screen.getByRole("progressbar", { name: /0% of target/i }),
    ).toHaveAttribute("aria-valuenow", "0");
  });

  it("computes progress against the £20,000 target (£5,000 raised → 25%)", () => {
    useQueryMock.mockReset();
    useQueryMock.mockReturnValue({
      raisedPence: 500_000,
      seatsBlue: 50,
      supporters: 50,
      totalSeats: 1280,
    });
    render(<ProgressBar />);
    expect(screen.getByTestId("progress-fill")).toHaveStyle({ width: "25%" });
    expect(screen.getByText("£5,000.00")).toBeInTheDocument();
  });

  it("clamps over-target progress at 100% and switches to a celebratory line", () => {
    useQueryMock.mockReset();
    useQueryMock.mockReturnValue({
      raisedPence: 25_000_00,
      seatsBlue: 0,
      supporters: 0,
      totalSeats: 0,
    });
    render(<ProgressBar />);
    expect(screen.getByText(/Edgbaston is blue/i)).toBeInTheDocument();
    expect(screen.getByTestId("progress-fill")).toHaveStyle({ width: "100%" });
  });
});
