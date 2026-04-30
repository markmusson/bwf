import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StepAmount } from "./StepAmount";

describe("StepAmount", () => {
  it("highlights the matching preset tile when value is one of the presets", () => {
    render(<StepAmount value={2500} onChange={() => undefined} />);
    expect(screen.getByLabelText("£25.00")).toBeChecked();
    expect(screen.getByTestId("amount-readout")).toHaveTextContent("£25.00");
  });

  it("emits the chosen preset amount in pence", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<StepAmount value={1000} onChange={onChange} />);
    await user.click(screen.getByLabelText("£50.00"));
    expect(onChange).toHaveBeenLastCalledWith(5000);
  });

  it("rejects custom amounts below the £10 floor with a friendly message", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<StepAmount value={1000} onChange={onChange} />);
    await user.click(screen.getByLabelText("Other"));
    const input = screen.getByLabelText(/Custom amount in £/i);
    await user.type(input, "5");
    expect(screen.getByRole("alert")).toHaveTextContent(/minimum is £10/i);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("emits a valid custom amount once the donor enters £15", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<StepAmount value={1000} onChange={onChange} />);
    await user.click(screen.getByLabelText("Other"));
    const input = screen.getByLabelText(/Custom amount in £/i);
    await user.type(input, "15");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(onChange).toHaveBeenLastCalledWith(1500);
  });
});
