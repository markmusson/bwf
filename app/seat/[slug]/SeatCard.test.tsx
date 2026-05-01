import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const useQueryMock = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => useQueryMock(...args),
}));

vi.mock("@/convex/_generated/api", () => ({
  api: { seats: { getCardBySlug: "api.seats.getCardBySlug" } },
}));

import { SeatCard } from "./SeatCard";

describe("SeatCard", () => {
  it("subscribes to api.seats.getCardBySlug with the slug", () => {
    useQueryMock.mockReset();
    useQueryMock.mockReturnValue(undefined);
    render(<SeatCard slug="hollies-3-12" />);
    expect(useQueryMock).toHaveBeenCalledWith("api.seats.getCardBySlug", {
      slug: "hollies-3-12",
    });
  });

  it("shows loading state while the query is undefined", () => {
    useQueryMock.mockReset();
    useQueryMock.mockReturnValue(undefined);
    render(<SeatCard slug="hollies-3-12" />);
    expect(screen.getByTestId("seat-card-loading")).toBeInTheDocument();
  });

  it("shows a not-found message when the query returns null", () => {
    useQueryMock.mockReset();
    useQueryMock.mockReturnValue(null);
    render(<SeatCard slug="24" />);
    expect(screen.getByText(/Seat not found/i)).toBeInTheDocument();
    expect(screen.getByText(/hollies-3-12/)).toBeInTheDocument();
  });

  it("shows an unclaimed state when donors === 0", () => {
    useQueryMock.mockReset();
    useQueryMock.mockReturnValue({
      seat: {
        stand: "wyatt",
        row: 2,
        num: 4,
        status: "available",
        slug: "wyatt-3-5",
        donors: 0,
      },
      donors: 0,
      raisedPence: 0,
      tributes: [],
    });
    render(<SeatCard slug="wyatt-3-5" />);
    expect(screen.getByText(/Wyatt Stand · Row 3, Seat 5/)).toBeInTheDocument();
    expect(screen.getByText(/This seat is unclaimed/i)).toBeInTheDocument();
    const cta = screen.getByRole("link", { name: /Claim this seat/i });
    expect(cta).toHaveAttribute("href", "/stadium");
  });

  it("renders all approved tributes for a seat with multiple donors", () => {
    useQueryMock.mockReset();
    useQueryMock.mockReturnValue({
      seat: {
        stand: "hollies",
        row: 1,
        num: 7,
        status: "taken",
        slug: "hollies-2-8",
        donors: 2,
      },
      donors: 2,
      raisedPence: 7500,
      tributes: [
        {
          tributeId: "t_2",
          text: "Bob was a hero of mine.",
          createdAt: 200,
          displayName: "John D.",
          amountPence: 5000,
          giftAid: false,
        },
        {
          tributeId: "t_1",
          text: "For my dad — Bob's legacy lives on.",
          createdAt: 100,
          displayName: "Sarah W.",
          amountPence: 2500,
          giftAid: true,
        },
      ],
    });
    render(<SeatCard slug="hollies-2-8" />);
    expect(
      screen.getByText(/Eric Hollies Stand · Row 2, Seat 8/),
    ).toBeInTheDocument();
    expect(screen.getByText(/2 donors/)).toBeInTheDocument();
    expect(screen.getByText(/£75 raised on this seat/)).toBeInTheDocument();
    expect(screen.getByText("John D.")).toBeInTheDocument();
    expect(screen.getByText("Sarah W.")).toBeInTheDocument();
    expect(screen.getByText(/Gift Aid/)).toBeInTheDocument();
    // Two tribute rows each show their own £ amount.
    expect(screen.getAllByText(/^£/)).toHaveLength(2);
  });

  it("renders Anonymous when displayName is null", () => {
    useQueryMock.mockReset();
    useQueryMock.mockReturnValue({
      seat: {
        stand: "hollies",
        row: 0,
        num: 0,
        status: "taken",
        slug: "hollies-1-1",
        donors: 1,
      },
      donors: 1,
      raisedPence: 1000,
      tributes: [
        {
          tributeId: "t_a",
          text: "anon tribute",
          createdAt: 1,
          displayName: null,
          amountPence: 1000,
          giftAid: false,
        },
      ],
    });
    render(<SeatCard slug="hollies-1-1" />);
    expect(screen.getByText("Anonymous")).toBeInTheDocument();
  });

  it("hides per-tribute amount when amountPence is null (donor opted out)", () => {
    useQueryMock.mockReset();
    useQueryMock.mockReturnValue({
      seat: {
        stand: "hollies",
        row: 0,
        num: 0,
        status: "taken",
        slug: "hollies-1-1",
        donors: 1,
      },
      donors: 1,
      raisedPence: 0,
      tributes: [
        {
          tributeId: "t_h",
          text: "shy donor",
          createdAt: 1,
          displayName: "Sarah W.",
          amountPence: null,
          giftAid: false,
        },
      ],
    });
    render(<SeatCard slug="hollies-1-1" />);
    // The tribute itself has no £; the seat header shows £0 raised.
    const tributeBlock = screen.getByTestId("seat-tributes");
    expect(tributeBlock.textContent ?? "").not.toMatch(/£/);
  });

  it("renders the empty-tributes message when donors paid but no tribute exists", () => {
    useQueryMock.mockReset();
    useQueryMock.mockReturnValue({
      seat: {
        stand: "hollies",
        row: 0,
        num: 0,
        status: "taken",
        slug: "hollies-1-1",
        donors: 1,
      },
      donors: 1,
      raisedPence: 1000,
      tributes: [],
    });
    render(<SeatCard slug="hollies-1-1" />);
    expect(
      screen.getByText(/No tribute messages on this seat yet/i),
    ).toBeInTheDocument();
  });
});
