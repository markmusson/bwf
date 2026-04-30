import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

// next/script is async-loaded by Next; tests just need a passthrough.
vi.mock("next/script", () => ({
  default: (props: Record<string, unknown>) => {
    const passthroughProps: Record<string, unknown> = { ...props };
    // Stripping non-DOM props that would warn in JSDOM.
    delete passthroughProps.strategy;
    return <script {...(passthroughProps as object)} />;
  },
}));

import { PlausibleScript } from "./PlausibleScript";

describe("PlausibleScript", () => {
  const original = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  });

  afterEach(() => {
    if (original === undefined) {
      delete process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
    } else {
      process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN = original;
    }
  });

  it("renders nothing when NEXT_PUBLIC_PLAUSIBLE_DOMAIN is unset", () => {
    const { container } = render(<PlausibleScript />);
    expect(container.querySelector("script")).toBeNull();
  });

  it("renders the Plausible script tag with data-domain when set", () => {
    process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN = "seats.bobwillisfund.org";
    const { container } = render(<PlausibleScript />);
    const script = container.querySelector("script");
    expect(script).not.toBeNull();
    expect(script?.getAttribute("data-domain")).toBe("seats.bobwillisfund.org");
    expect(script?.getAttribute("src")).toBe(
      "https://plausible.io/js/script.js",
    );
  });
});
