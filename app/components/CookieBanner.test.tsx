import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CookieBanner } from "./CookieBanner";

describe("CookieBanner", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("shows on first visit", async () => {
    render(<CookieBanner />);
    expect(await screen.findByTestId("cookie-banner")).toBeInTheDocument();
  });

  it("hides itself after the donor clicks OK and remembers across renders", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<CookieBanner />);
    await screen.findByTestId("cookie-banner");
    await user.click(screen.getByRole("button", { name: /OK, got it/i }));
    expect(screen.queryByTestId("cookie-banner")).not.toBeInTheDocument();
    unmount();

    // Re-render — should stay hidden because of localStorage.
    render(<CookieBanner />);
    expect(screen.queryByTestId("cookie-banner")).not.toBeInTheDocument();
  });
});
