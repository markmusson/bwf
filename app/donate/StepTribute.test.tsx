import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  EMPTY_STEP_TRIBUTE,
  StepTribute,
  type StepTributeValue,
} from "./StepTribute";

function setup(initial: StepTributeValue = EMPTY_STEP_TRIBUTE) {
  let current = initial;
  const onChange = vi.fn((next: StepTributeValue) => {
    current = next;
  });
  const utils = render(<StepTribute value={current} onChange={onChange} />);
  const rerender = () =>
    utils.rerender(<StepTribute value={current} onChange={onChange} />);
  return {
    onChange,
    rerender,
    get value() {
      return current;
    },
  };
}

describe("StepTribute", () => {
  it("renders empty inputs from the default value", () => {
    render(
      <StepTribute value={EMPTY_STEP_TRIBUTE} onChange={() => undefined} />,
    );
    expect(screen.getByLabelText(/Who is this seat dedicated to/i)).toHaveValue(
      "",
    );
    expect(screen.getByLabelText(/Your name \(optional\)/i)).toHaveValue("");
    expect(screen.getByLabelText(/Leave a tribute/i)).toHaveValue("");
    expect(screen.getByLabelText(/Hide my name/i)).not.toBeChecked();
    expect(screen.getByLabelText(/Hide my donation amount/i)).not.toBeChecked();
    expect(screen.getByText(/280 characters left/)).toBeInTheDocument();
  });

  it("captures the recipient name typed by the donor", async () => {
    const probe = setup();
    const user = userEvent.setup();
    const input = screen.getByLabelText(/Who is this seat dedicated to/i);
    for (const char of "Ricky") {
      await user.type(input, char);
      probe.rerender();
    }
    expect(probe.value.recipientName).toBe("Ricky");
  });

  it("appends typed characters into the tribute text", async () => {
    const probe = setup();
    const user = userEvent.setup();
    const textarea = screen.getByLabelText(/Leave a tribute/i);

    for (const char of "For Bob.") {
      await user.type(textarea, char);
      probe.rerender();
    }

    expect(probe.value.text).toBe("For Bob.");
  });

  it("clamps tribute text at 280 characters", () => {
    const onChange = vi.fn();
    render(
      <StepTribute
        value={{ ...EMPTY_STEP_TRIBUTE, text: "x".repeat(279) }}
        onChange={onChange}
      />,
    );
    expect(screen.getByText(/1 characters left/)).toBeInTheDocument();
  });

  it("toggles hide-name and hide-amount independently", async () => {
    const probe = setup();
    const user = userEvent.setup();

    await user.click(screen.getByLabelText(/Hide my name/i));
    expect(probe.value.hideName).toBe(true);

    await user.click(screen.getByLabelText(/Hide my donation amount/i));
    probe.rerender();
    expect(probe.value.hideAmount).toBe(true);
  });
});
