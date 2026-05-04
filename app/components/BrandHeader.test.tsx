import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrandHeader } from "./BrandHeader";

describe("BrandHeader", () => {
  it("renders the Blue for Bob 2026 campaign title", () => {
    render(<BrandHeader />);
    expect(
      screen.getByRole("heading", { name: /Blue for Bob 2026/i }),
    ).toBeInTheDocument();
  });

  it("does not render the BWF logo in the header (it sits centre-stadium)", () => {
    const { container } = render(<BrandHeader />);
    expect(container.querySelector("img")).toBeNull();
    expect(
      screen.queryByRole("link", { name: /The Bob Willis Fund — home/i }),
    ).toBeNull();
  });

  it("renders the three match-info pills with no emoji", () => {
    render(<BrandHeader />);
    const list = screen.getByRole("list", { name: /Match information/i });
    const items = list.querySelectorAll("li");
    expect(items).toHaveLength(3);
    for (const li of items) {
      // The mock has plain text pills — no emoji prefix.
      expect(li.textContent ?? "").not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
    }
  });
});
