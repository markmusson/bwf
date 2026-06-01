import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrandFooter } from "./BrandFooter";

describe("BrandFooter", () => {
  it("includes the BWF charity number 1185346", () => {
    render(<BrandFooter />);
    expect(screen.getByText(/1185346/)).toBeInTheDocument();
  });

  it("renders the mock-style mission line and Bob Willis dates", () => {
    render(<BrandFooter />);
    expect(
      screen.getByText(/Raising money for better prostate cancer screening/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Named in honour of Bob Willis/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/1949–2019/)).toBeInTheDocument();
    expect(
      screen.getByText(/Administered by The Talent Fund/i),
    ).toBeInTheDocument();
  });

  it("links to the BWF main site", () => {
    render(<BrandFooter />);
    const link = screen.getByRole("link", { name: /bobwillisfund\.org/i });
    expect(link).toHaveAttribute("href", "https://bobwillisfund.org");
  });

  it("links to privacy and terms (prize draw link hidden until the prize is confirmed)", () => {
    render(<BrandFooter />);
    expect(screen.getByRole("link", { name: /Privacy/ })).toHaveAttribute(
      "href",
      "/privacy",
    );
    expect(screen.getByRole("link", { name: /^Terms$/ })).toHaveAttribute(
      "href",
      "/terms",
    );
    // Prize draw link is suppressed pre-launch; the page itself still
    // exists at /prize-terms for direct links but isn't surfaced here.
    expect(
      screen.queryByRole("link", { name: /Prize draw T&Cs/i }),
    ).toBeNull();
  });
});
