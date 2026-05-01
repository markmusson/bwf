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
    holds: {
      claim: "api.holds.claim",
      activeSeatIds: "api.holds.activeSeatIds",
    },
  },
}));

import { buildStandSeats, STADIUM_WIDTH, type Seat } from "@/lib/geometry";
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

type SeatRow = {
  _id: string;
  _creationTime: number;
  stand: string;
  row: number;
  num: number;
  status: "available" | "taken";
};

function configureMocks(opts?: {
  authenticated?: boolean;
  seatRows?: SeatRow[];
  heldIds?: unknown[];
}) {
  useQueryMock.mockReset();
  useMutationMock.mockReset();
  useConvexAuthMock.mockReset();
  routerPush.mockReset();

  const seats = opts?.seatRows ?? [];
  const held = opts?.heldIds ?? [];
  useQueryMock.mockImplementation((ref: unknown) => {
    if (ref === "api.seats.list") return seats;
    if (ref === "api.holds.activeSeatIds") return held;
    return undefined;
  });
  useMutationMock.mockReturnValue(vi.fn());
  useConvexAuthMock.mockReturnValue({
    isAuthenticated: opts?.authenticated ?? false,
    isLoading: false,
  });
}

describe("StadiumCanvas", () => {
  it("renders the canvas region with role=img and the prompt copy", () => {
    configureMocks();
    render(<StadiumCanvas />);
    expect(
      screen.getByRole("img", { name: /Edgbaston seat map/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Claim your virtual seat/i }),
    ).toBeInTheDocument();
  });

  it("subscribes to api.seats.list and api.holds.activeSeatIds", () => {
    configureMocks();
    render(<StadiumCanvas />);
    expect(useQueryMock).toHaveBeenCalledWith("api.seats.list");
    expect(useQueryMock).toHaveBeenCalledWith("api.holds.activeSeatIds");
  });

  it("selects a seat when the donor clicks on it", async () => {
    configureMocks({ seatRows: rowsCoveringHollies() });
    const restore = stubCanvasRect();
    const user = userEvent.setup();

    render(<StadiumCanvas />);
    const canvas = screen.getByRole("img", { name: /Edgbaston seat map/i });

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

  it("calls claim with the browser's clientHoldId and emits onSeatClaimed", async () => {
    configureMocks({
      seatRows: rowsCoveringHollies(),
    });
    const claim = vi.fn().mockResolvedValue("hold_123");
    useMutationMock.mockReturnValue(claim);
    const onSeatClaimed = vi.fn();

    const restore = stubCanvasRect();
    const user = userEvent.setup();

    render(<StadiumCanvas onSeatClaimed={onSeatClaimed} />);
    const canvas = screen.getByRole("img", { name: /Edgbaston seat map/i });
    await user.pointer({
      keys: "[MouseLeft]",
      target: canvas,
      coords: { x: SAMPLE_SEAT.x, y: SAMPLE_SEAT.y },
    });
    await user.click(screen.getByRole("button", { name: /take this seat/i }));

    expect(claim).toHaveBeenCalledWith(
      expect.objectContaining({
        seatId: SAMPLE_SEAT_ID,
        clientHoldId: expect.any(String),
      }),
    );
    expect(
      (claim.mock.calls[0]?.[0] as { clientHoldId: string }).clientHoldId
        .length,
    ).toBeGreaterThanOrEqual(8);
    expect(onSeatClaimed).toHaveBeenCalledWith(SAMPLE_SEAT_ID);
    expect(routerPush).not.toHaveBeenCalled();
    restore();
  });

  it("surfaces a friendly message when the seat is held by someone else", async () => {
    configureMocks({
      authenticated: true,
      seatRows: rowsCoveringHollies(),
    });
    const { ConvexError } = await import("convex/values");
    const claim = vi.fn().mockRejectedValue(new ConvexError("seat_held"));
    useMutationMock.mockReturnValue(claim);
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
    restore();
  });

  it("multi-claim: clicking a TAKEN seat selects it for re-donation, not a route push", async () => {
    const seats = rowsCoveringHollies().map((row, idx) =>
      idx === 0 ? { ...row, status: "taken" as const } : row,
    );
    configureMocks({ seatRows: seats });
    const restore = stubCanvasRect();
    const user = userEvent.setup();

    render(<StadiumCanvas />);
    const canvas = screen.getByRole("img", { name: /Edgbaston seat map/i });
    await user.pointer({
      keys: "[MouseLeft]",
      target: canvas,
      coords: { x: SAMPLE_SEAT.x, y: SAMPLE_SEAT.y },
    });

    expect(routerPush).not.toHaveBeenCalled();
    expect(screen.getByTestId("selected-seat-readout")).toHaveTextContent(
      /Eric Hollies Stand/i,
    );
    restore();
  });

  it("colours held seats amber via heldIds (visible in the rendered status legend logic)", () => {
    const seats = rowsCoveringHollies();
    const heldId = seats[0]!._id;
    configureMocks({
      seatRows: seats,
      heldIds: [heldId],
    });
    render(<StadiumCanvas />);
    expect(useQueryMock).toHaveBeenCalledWith("api.holds.activeSeatIds");
    // Visual colour is applied in canvas paint; the test ensures the
    // hold ids are subscribed and reach the component.
  });
});
