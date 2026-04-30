import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const useQueryMock = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => useQueryMock(...args),
}));

vi.mock("@/convex/_generated/api", () => ({
  api: { seats: { getCard: "api.seats.getCard" } },
}));

import { SeatCard } from "./SeatCard";

describe("SeatCard", () => {
  it("subscribes to api.seats.getCard with the seat id", () => {
    useQueryMock.mockReset();
    useQueryMock.mockReturnValue(undefined);
    render(<SeatCard seatId="seat_42" />);
    expect(useQueryMock).toHaveBeenCalledWith("api.seats.getCard", {
      seatId: "seat_42",
    });
  });

  it("shows loading state while the query is undefined", () => {
    useQueryMock.mockReset();
    useQueryMock.mockReturnValue(undefined);
    render(<SeatCard seatId="seat_42" />);
    expect(screen.getByTestId("seat-card-loading")).toBeInTheDocument();
  });

  it("shows a not-found message when the query returns null", () => {
    useQueryMock.mockReset();
    useQueryMock.mockReturnValue(null);
    render(<SeatCard seatId="seat_unknown" />);
    expect(screen.getByText(/Seat not found/i)).toBeInTheDocument();
  });

  it("shows an available state with a claim CTA when the seat is unclaimed", () => {
    useQueryMock.mockReset();
    useQueryMock.mockReturnValue({
      seat: { stand: "wyatt", row: 2, num: 4, status: "available" },
      donation: null,
      tribute: null,
    });
    render(<SeatCard seatId="seat_a" />);
    expect(screen.getByText(/Wyatt Stand · Row 3, Seat 5/)).toBeInTheDocument();
    expect(screen.getByText(/This seat is unclaimed/i)).toBeInTheDocument();
    const cta = screen.getByRole("link", { name: /Claim a seat/i });
    expect(cta).toHaveAttribute("href", "/stadium");
  });

  it("renders display name + amount + tribute when the seat is taken", () => {
    useQueryMock.mockReset();
    useQueryMock.mockReturnValue({
      seat: { stand: "hollies", row: 1, num: 7, status: "taken" },
      donation: { displayName: "Sarah W.", amountPence: 2500, giftAid: true },
      tribute: { text: "For Bob." },
    });
    render(<SeatCard seatId="seat_t" />);
    expect(
      screen.getByText(/Eric Hollies Stand · Row 2, Seat 8/),
    ).toBeInTheDocument();
    expect(screen.getByText("Sarah W.")).toBeInTheDocument();
    expect(screen.getByText(/£25/)).toBeInTheDocument();
    expect(screen.getByText("For Bob.")).toBeInTheDocument();
  });

  it("renders Anonymous when displayName is null", () => {
    useQueryMock.mockReset();
    useQueryMock.mockReturnValue({
      seat: { stand: "hollies", row: 0, num: 0, status: "taken" },
      donation: { displayName: null, amountPence: 1000, giftAid: false },
      tribute: null,
    });
    render(<SeatCard seatId="seat_anon" />);
    expect(screen.getByText("Anonymous")).toBeInTheDocument();
  });

  it("hides the amount when amountPence is null", () => {
    useQueryMock.mockReset();
    useQueryMock.mockReturnValue({
      seat: { stand: "hollies", row: 0, num: 0, status: "taken" },
      donation: { displayName: "Sarah W.", amountPence: null, giftAid: false },
      tribute: null,
    });
    render(<SeatCard seatId="seat_hideamt" />);
    expect(screen.queryByText(/£/)).not.toBeInTheDocument();
  });

  it("does not render a tribute block when there is no approved tribute", () => {
    useQueryMock.mockReset();
    useQueryMock.mockReturnValue({
      seat: { stand: "hollies", row: 0, num: 0, status: "taken" },
      donation: { displayName: "Sarah W.", amountPence: 1000, giftAid: false },
      tribute: null,
    });
    render(<SeatCard seatId="seat_notrib" />);
    expect(screen.queryByTestId("seat-tribute")).not.toBeInTheDocument();
  });
});
