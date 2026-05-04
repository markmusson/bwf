import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SeatStatesKey } from "./SeatStatesKey";

describe("SeatStatesKey", () => {
  it("lists the three single-claim seat states", () => {
    render(<SeatStatesKey />);
    const list = screen.getByRole("list", { name: /Seat states key/i });
    expect(list.querySelectorAll("li")).toHaveLength(3);
    expect(screen.getByText(/Available/)).toBeInTheDocument();
    expect(screen.getByText(/Held — someone's paying/)).toBeInTheDocument();
    expect(screen.getByText(/^Claimed$/)).toBeInTheDocument();
  });
});
