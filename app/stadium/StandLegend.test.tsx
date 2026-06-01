import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const useQueryMock = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => useQueryMock(...args),
}));

vi.mock("@/convex/_generated/api", () => ({
  api: { seats: { standCounts: "api.seats.standCounts" } },
}));

import { StandLegend } from "./StandLegend";

describe("StandLegend", () => {
  it("renders one tile per stand from the locked STANDS data", () => {
    useQueryMock.mockReset();
    useQueryMock.mockReturnValue({});
    render(<StandLegend />);
    const list = screen.getByRole("list", { name: /Stands/i });
    expect(list.querySelectorAll("li")).toHaveLength(6);
    expect(screen.getByTestId("stand-tile-hollies")).toHaveTextContent(
      /Eric Hollies Stand/,
    );
  });

  it("fills proportional to taken/total per stand", () => {
    useQueryMock.mockReset();
    useQueryMock.mockReturnValue({
      hollies: { taken: 200, total: 400 },
      wyatt: { taken: 100, total: 100 },
    });
    render(<StandLegend />);
    expect(screen.getByTestId("stand-fill-hollies")).toHaveStyle({
      width: "50%",
    });
    expect(screen.getByTestId("stand-fill-wyatt")).toHaveStyle({
      width: "100%",
    });
    expect(screen.getByTestId("stand-tile-hollies")).toHaveTextContent(/200/);
    expect(screen.getByTestId("stand-tile-hollies")).toHaveTextContent(/400/);
  });

  it("flat £10 across every stand (price node kept for sr-only readers)", () => {
    useQueryMock.mockReset();
    useQueryMock.mockReturnValue({});
    render(<StandLegend />);
    for (const id of ["hollies", "south", "wyatt", "scrivens"]) {
      expect(screen.getByTestId(`stand-price-${id}`).textContent).toContain(
        "£10",
      );
    }
  });

  it("renders the claimed/total count in 'X / Y' format", () => {
    useQueryMock.mockReset();
    useQueryMock.mockReturnValue({
      hollies: { taken: 82, total: 457 },
    });
    render(<StandLegend />);
    expect(screen.getByTestId("stand-count-hollies").textContent).toMatch(
      /82\s*\/\s*457/,
    );
  });

  it("renders pill-style tiles in a single flex-wrap row, not a card grid", () => {
    useQueryMock.mockReset();
    useQueryMock.mockReturnValue({});
    render(<StandLegend />);
    const list = screen.getByRole("list", { name: /Stands/i });
    expect(list.className).toMatch(/flex/);
    expect(list.className).toMatch(/flex-wrap/);
    for (const stand of [
      "hollies",
      "wyatt",
      "stanley",
      "south",
      "west",
      "scrivens",
    ]) {
      expect(screen.getByTestId(`stand-tile-${stand}`).className).toMatch(
        /rounded-full/,
      );
    }
  });

  it("invokes onStandClick when a tile is interactive and clicked", async () => {
    useQueryMock.mockReset();
    useQueryMock.mockReturnValue({});
    const onStandClick = vi.fn();
    const user = userEvent.setup();
    render(<StandLegend onStandClick={onStandClick} />);
    await user.click(screen.getByTestId("stand-tile-scrivens"));
    expect(onStandClick).toHaveBeenCalledWith("scrivens");
  });
});
