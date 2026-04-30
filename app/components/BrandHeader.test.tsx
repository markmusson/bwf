import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrandHeader } from "./BrandHeader";

describe("BrandHeader", () => {
  it("renders the campaign title and brand text", () => {
    render(<BrandHeader />);
    expect(
      screen.getByRole("heading", { name: /Blue for Bob 2026/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Bob Willis/)).toBeInTheDocument();
    expect(screen.getByText(/Fund/)).toBeInTheDocument();
  });

  it("links the brand mark home", () => {
    render(<BrandHeader />);
    const links = screen.getAllByRole("link", {
      name: /The Bob Willis Fund — home/i,
    });
    expect(links[0]).toHaveAttribute("href", "/stadium");
  });

  it("renders the three match-info pills", () => {
    render(<BrandHeader />);
    const list = screen.getByRole("list", { name: /Match information/i });
    expect(list).toBeInTheDocument();
    expect(list.querySelectorAll("li")).toHaveLength(3);
  });
});
