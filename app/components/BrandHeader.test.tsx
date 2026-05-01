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

  it("links the BWF logo home", () => {
    render(<BrandHeader />);
    const link = screen.getByRole("link", {
      name: /The Bob Willis Fund — home/i,
    });
    expect(link).toHaveAttribute("href", "/stadium");
    const img = link.querySelector("img");
    expect(img?.getAttribute("src")).toMatch(/bwf-logo-white\.svg/);
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
