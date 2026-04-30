import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { Countdown } from "./Countdown";

const TARGET_ISO = "2026-07-14T10:00:00.000Z";

describe("Countdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("zero-pads the four cells from a multi-day remaining duration", () => {
    vi.setSystemTime(new Date(Date.UTC(2026, 6, 11, 5, 42, 18)));
    render(<Countdown targetIso={TARGET_ISO} />);
    expect(screen.getByTestId("countdown-days")).toHaveTextContent("03");
    expect(screen.getByTestId("countdown-hrs")).toHaveTextContent("04");
    expect(screen.getByTestId("countdown-min")).toHaveTextContent("17");
    expect(screen.getByTestId("countdown-sec")).toHaveTextContent("42");
  });

  it("ticks every second", () => {
    vi.setSystemTime(new Date(Date.UTC(2026, 6, 14, 9, 59, 50)));
    render(<Countdown targetIso={TARGET_ISO} />);
    expect(screen.getByTestId("countdown-sec")).toHaveTextContent("10");
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId("countdown-sec")).toHaveTextContent("09");
  });

  it("zeroes once the target has passed", () => {
    vi.setSystemTime(new Date(Date.UTC(2026, 6, 14, 11, 0, 0)));
    render(<Countdown targetIso={TARGET_ISO} />);
    expect(screen.getByTestId("countdown-days")).toHaveTextContent("00");
    expect(screen.getByTestId("countdown-hrs")).toHaveTextContent("00");
    expect(screen.getByTestId("countdown-min")).toHaveTextContent("00");
    expect(screen.getByTestId("countdown-sec")).toHaveTextContent("00");
  });
});
