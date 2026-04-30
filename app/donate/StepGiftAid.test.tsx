import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  EMPTY_GIFT_AID_VALUE,
  StepGiftAid,
  type StepGiftAidValue,
} from "./StepGiftAid";

function setup(initial: StepGiftAidValue = EMPTY_GIFT_AID_VALUE) {
  let current = initial;
  const onChange = vi.fn((next: StepGiftAidValue) => {
    current = next;
  });

  const utils = render(
    <StepGiftAid amountPence={2000} value={current} onChange={onChange} />,
  );

  const rerender = () =>
    utils.rerender(
      <StepGiftAid amountPence={2000} value={current} onChange={onChange} />,
    );

  return {
    onChange,
    get value() {
      return current;
    },
    rerender,
  };
}

describe("StepGiftAid", () => {
  it("hides confirmations and uplift summary when Gift Aid is disabled", () => {
    setup();
    expect(
      screen.queryByRole("group", { name: "Gift Aid uplift summary" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("group", { name: /declarations/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/I am a UK taxpayer/i)).not.toBeInTheDocument();
  });

  it("shows the £X → £Y uplift when Gift Aid is enabled", async () => {
    const user = userEvent.setup();
    const { rerender } = setup();

    await user.click(screen.getByRole("checkbox", { name: /Add Gift Aid/i }));
    rerender();

    const summary = screen.getByRole("group", {
      name: "Gift Aid uplift summary",
    });
    expect(summary).toHaveTextContent("£20.00");
    expect(summary).toHaveTextContent("£25.00");
  });

  it("renders all three HMRC declarations once enabled", async () => {
    const user = userEvent.setup();
    const { rerender } = setup();

    await user.click(screen.getByRole("checkbox", { name: /Add Gift Aid/i }));
    rerender();

    expect(screen.getAllByRole("checkbox")).toHaveLength(4);
    expect(screen.getByText(/I am a UK taxpayer/i)).toBeInTheDocument();
    expect(screen.getByText(/This is my own money/i)).toBeInTheDocument();
    expect(
      screen.getByText(/sweepstake, raffle or lottery/i),
    ).toBeInTheDocument();
  });

  it("warns the donor while not all three declarations are ticked", async () => {
    const user = userEvent.setup();
    const { rerender } = setup();

    await user.click(screen.getByRole("checkbox", { name: /Add Gift Aid/i }));
    rerender();

    expect(screen.getByRole("alert")).toHaveTextContent(
      /three declarations must be confirmed/i,
    );

    const [_toggle, ukTaxpayer, ownMoney, noBenefit] =
      screen.getAllByRole("checkbox");
    void _toggle;
    await user.click(ukTaxpayer!);
    rerender();
    await user.click(ownMoney!);
    rerender();
    await user.click(noBenefit!);
    rerender();

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("clears confirmations when the donor turns Gift Aid off", async () => {
    const user = userEvent.setup();
    const { onChange, rerender } = setup({
      enabled: true,
      confirmations: { ukTaxpayer: true, ownMoney: true, noBenefit: true },
    });

    rerender();
    const toggle = screen.getByRole("checkbox", { name: /Add Gift Aid/i });
    await user.click(toggle);

    expect(onChange).toHaveBeenLastCalledWith({
      enabled: false,
      confirmations: { ukTaxpayer: false, ownMoney: false, noBenefit: false },
    });
  });
});
