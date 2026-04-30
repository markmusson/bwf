import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrandHeader } from "./BrandHeader";

describe("BrandHeader", () => {
  it("renders the campaign title and subtitle", () => {
    render(<BrandHeader />);
    expect(screen.getByText("Blue for Bob 2026")).toBeInTheDocument();
    expect(screen.getByText(/The Bob Willis Fund/)).toBeInTheDocument();
  });

  it("links the brand mark home", () => {
    render(<BrandHeader />);
    const link = screen.getByRole("link", {
      name: /The Bob Willis Fund — home/i,
    });
    expect(link).toHaveAttribute("href", "/stadium");
  });

  it("renders the three match-info pills", () => {
    render(<BrandHeader />);
    const list = screen.getByRole("list", { name: /Match information/i });
    expect(list).toBeInTheDocument();
    expect(list.querySelectorAll("li")).toHaveLength(3);
  });
});
