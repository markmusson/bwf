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

  it("invokes onStandClick when a tile is interactive and clicked", async () => {
    useQueryMock.mockReset();
    useQueryMock.mockReturnValue({});
    const onStandClick = vi.fn();
    const user = userEvent.setup();
    render(<StandLegend onStandClick={onStandClick} />);
    await user.click(screen.getByTestId("stand-tile-priory"));
    expect(onStandClick).toHaveBeenCalledWith("priory");
  });
});
