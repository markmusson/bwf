import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const useQueryMock = vi.fn();
const useMutationMock = vi.fn();
const useConvexAuthMock = vi.fn();
const routerPush = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => useQueryMock(...args),
  useMutation: (...args: unknown[]) => useMutationMock(...args),
  useConvexAuth: () => useConvexAuthMock(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush }),
}));

vi.mock("@/convex/_generated/api", () => ({
  api: {
    seats: { list: "api.seats.list" },
    holds: { claim: "api.holds.claim" },
  },
}));

import {
  buildStandSeats,
  CENTER_X,
  CENTER_Y,
  STADIUM_WIDTH,
  type Seat,
} from "@/lib/geometry";
import { STANDS } from "@/lib/stands";
import { StadiumCanvas } from "./StadiumCanvas";

const HOLLIES = STANDS.find((s) => s.id === "hollies")!;
const HOLLIES_SEATS = buildStandSeats(HOLLIES);
const SAMPLE_SEAT: Seat = HOLLIES_SEATS[0]!;
const SAMPLE_SEAT_ID = `seat_${SAMPLE_SEAT.standId}_R_${SAMPLE_SEAT.rowIndex}_${SAMPLE_SEAT.colIndex}`;

function rowsCoveringHollies() {
  return HOLLIES_SEATS.map((seat) => ({
    _id: `seat_${seat.standId}_R_${seat.rowIndex}_${seat.colIndex}`,
    _creationTime: 0,
    stand: seat.standId,
    row: seat.rowIndex,
    num: seat.colIndex,
    status: "available" as const,
  }));
}

function stubCanvasRect(width = STADIUM_WIDTH) {
  const original = HTMLCanvasElement.prototype.getBoundingClientRect;
  HTMLCanvasElement.prototype.getBoundingClientRect = function () {
    return {
      x: 0,
      y: 0,
      width,
      height: width * (500 / 680),
      top: 0,
      left: 0,
      right: width,
      bottom: width * (500 / 680),
      toJSON: () => ({}),
    } as DOMRect;
  };
  return () => {
    HTMLCanvasElement.prototype.getBoundingClientRect = original;
  };
}

function defaultMocks(opts?: { authenticated?: boolean }) {
  useQueryMock.mockReset();
  useMutationMock.mockReset();
  useConvexAuthMock.mockReset();
  routerPush.mockReset();

  useQueryMock.mockReturnValue([]);
  useMutationMock.mockReturnValue(vi.fn());
  useConvexAuthMock.mockReturnValue({
    isAuthenticated: opts?.authenticated ?? false,
    isLoading: false,
  });
}

describe("StadiumCanvas", () => {
  it("subscribes to api.seats.list via useQuery", () => {
    defaultMocks();
    render(<StadiumCanvas />);
    expect(useQueryMock).toHaveBeenCalledWith("api.seats.list");
  });

  it("shows the loading copy while the query is undefined", () => {
    defaultMocks();
    useQueryMock.mockReturnValue(undefined);
    render(<StadiumCanvas />);
    expect(screen.getByTestId("seat-count-readout")).toHaveTextContent(
      /Loading the stadium/i,
    );
  });

  it("renders the seat count with thousands separator once the query lands", () => {
    defaultMocks();
    const seats = Array.from({ length: 1280 }, (_, i) => ({
      _id: `seat_${i}`,
      _creationTime: 0,
      stand: "hollies",
      row: 0,
      num: i,
      status: "available" as const,
    }));
    useQueryMock.mockReturnValue(seats);
    render(<StadiumCanvas />);
    expect(screen.getByTestId("seat-count-readout")).toHaveTextContent(
      /1,280 seats in play/,
    );
  });

  it("selects a seat when the donor clicks near it on the canvas", async () => {
    defaultMocks();
    useQueryMock.mockReturnValue(rowsCoveringHollies());
    const restore = stubCanvasRect();
    const user = userEvent.setup();

    render(<StadiumCanvas />);
    const canvas = screen.getByRole("img", { name: /Edgbaston seat map/i });

    // Click at the stadium centre — no seat there, nothing selected.
    await user.pointer({
      keys: "[MouseLeft]",
      target: canvas,
      coords: { x: CENTER_X, y: CENTER_Y },
    });
    expect(
      screen.queryByTestId("selected-seat-readout"),
    ).not.toBeInTheDocument();

    // Click on the exact position of Hollies row 0 col 0.
    await user.pointer({
      keys: "[MouseLeft]",
      target: canvas,
      coords: { x: SAMPLE_SEAT.x, y: SAMPLE_SEAT.y },
    });
    expect(screen.getByTestId("selected-seat-readout")).toHaveTextContent(
      /Eric Hollies Stand/i,
    );

    restore();
  });

  it("redirects to /signin when an unauthenticated donor takes a seat", async () => {
    defaultMocks({ authenticated: false });
    useQueryMock.mockReturnValue(rowsCoveringHollies());
    const restore = stubCanvasRect();
    const user = userEvent.setup();

    render(<StadiumCanvas />);
    const canvas = screen.getByRole("img", { name: /Edgbaston seat map/i });
    await user.pointer({
      keys: "[MouseLeft]",
      target: canvas,
      coords: { x: SAMPLE_SEAT.x, y: SAMPLE_SEAT.y },
    });

    await user.click(
      screen.getByRole("button", { name: /sign in to take this seat/i }),
    );

    expect(routerPush).toHaveBeenCalledWith("/signin");
    restore();
  });

  it("calls api.holds.claim and routes to /donate on success", async () => {
    defaultMocks({ authenticated: true });
    const claim = vi.fn().mockResolvedValue("hold_123");
    useMutationMock.mockReturnValue(claim);
    useQueryMock.mockReturnValue(rowsCoveringHollies());
    const restore = stubCanvasRect();
    const user = userEvent.setup();

    render(<StadiumCanvas />);
    const canvas = screen.getByRole("img", { name: /Edgbaston seat map/i });
    await user.pointer({
      keys: "[MouseLeft]",
      target: canvas,
      coords: { x: SAMPLE_SEAT.x, y: SAMPLE_SEAT.y },
    });

    await user.click(screen.getByRole("button", { name: /take this seat/i }));

    expect(claim).toHaveBeenCalledTimes(1);
    expect(claim).toHaveBeenCalledWith({ seatId: SAMPLE_SEAT_ID });
    expect(routerPush).toHaveBeenCalledWith("/donate");
    restore();
  });

  it("surfaces a friendly message when the seat is held by someone else", async () => {
    defaultMocks({ authenticated: true });
    const { ConvexError } = await import("convex/values");
    const claim = vi.fn().mockRejectedValue(new ConvexError("seat_held"));
    useMutationMock.mockReturnValue(claim);
    useQueryMock.mockReturnValue(rowsCoveringHollies());
    const restore = stubCanvasRect();
    const user = userEvent.setup();

    render(<StadiumCanvas />);
    const canvas = screen.getByRole("img", { name: /Edgbaston seat map/i });
    await user.pointer({
      keys: "[MouseLeft]",
      target: canvas,
      coords: { x: SAMPLE_SEAT.x, y: SAMPLE_SEAT.y },
    });
    await user.click(screen.getByRole("button", { name: /take this seat/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /Someone else is taking that seat/i,
    );
    expect(routerPush).not.toHaveBeenCalled();
    restore();
  });
});
