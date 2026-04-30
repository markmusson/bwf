import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const useQueryMock = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => useQueryMock(...args),
}));

vi.mock("@/convex/_generated/api", () => ({
  api: { seats: { list: "api.seats.list" } },
}));

import { StadiumCanvas } from "./StadiumCanvas";

describe("StadiumCanvas", () => {
  it("subscribes to api.seats.list via useQuery", () => {
    useQueryMock.mockReset();
    useQueryMock.mockReturnValue([]);
    render(<StadiumCanvas />);
    expect(useQueryMock).toHaveBeenCalledWith("api.seats.list");
  });

  it("shows the loading copy while the query is undefined", () => {
    useQueryMock.mockReset();
    useQueryMock.mockReturnValue(undefined);
    render(<StadiumCanvas />);
    expect(screen.getByTestId("seat-count-readout")).toHaveTextContent(
      /Loading the stadium/i,
    );
  });

  it("renders the seat count with thousands separator once the query lands", () => {
    useQueryMock.mockReset();
    const seats = Array.from({ length: 1280 }, (_, i) => ({
      _id: `seat_${i}` as unknown,
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

  it("renders the canvas region with role=img and an aria-label", () => {
    useQueryMock.mockReset();
    useQueryMock.mockReturnValue([]);
    render(<StadiumCanvas />);
    expect(
      screen.getByRole("img", { name: /Edgbaston seat map/i }),
    ).toBeInTheDocument();
  });
});
