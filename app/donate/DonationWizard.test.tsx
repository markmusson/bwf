import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { DonationWizard } from "./DonationWizard";

async function clickNext(user: UserEvent, label: "Next" | "Pay" = "Next") {
  await user.click(screen.getByRole("button", { name: label }));
}

async function answerMarketingIfPresent(user: UserEvent) {
  const optIn = screen.queryByLabelText(/happy to be contacted/i);
  if (optIn) await user.click(optIn);
}

describe("DonationWizard", () => {
  it("renders step 1 (Choose your donation) by default", () => {
    render(<DonationWizard />);
    expect(
      screen.getByRole("heading", { name: "Choose your donation" }),
    ).toBeInTheDocument();
  });

  it("disables Back on step 1 and disables Next on the final step", async () => {
    const user = userEvent.setup();
    render(<DonationWizard />);

    expect(screen.getByRole("button", { name: "Back" })).toBeDisabled();

    for (let i = 0; i < 7; i++) {
      await answerMarketingIfPresent(user);
      await clickNext(user, i === 6 ? "Pay" : "Next");
    }

    expect(
      screen.getByRole("heading", { name: "Thank you" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("walks Next through the eight screens in order", async () => {
    const user = userEvent.setup();
    render(<DonationWizard />);

    const expected = [
      "Choose your donation",
      "Your email",
      "Your details",
      "Leave a tribute",
      "Add Gift Aid",
      "Build your avatar",
      "Pay securely",
      "Thank you",
    ];

    for (let i = 0; i < expected.length; i++) {
      const heading = expected[i]!;
      expect(
        screen.getByRole("heading", { name: heading }),
      ).toBeInTheDocument();
      if (i < expected.length - 1) {
        await answerMarketingIfPresent(user);
        await clickNext(user, i === 6 ? "Pay" : "Next");
      }
    }
  });

  it("renders the StepGiftAid form on step 5", async () => {
    const user = userEvent.setup();
    render(<DonationWizard />);

    for (let i = 0; i < 4; i++) {
      await answerMarketingIfPresent(user);
      await clickNext(user);
    }

    expect(
      screen.getByRole("checkbox", { name: /Add Gift Aid/i }),
    ).toBeInTheDocument();
  });

  it("preserves Gift Aid state across navigation", async () => {
    const user = userEvent.setup();
    render(<DonationWizard />);

    for (let i = 0; i < 4; i++) {
      await answerMarketingIfPresent(user);
      await clickNext(user);
    }

    await user.click(screen.getByRole("checkbox", { name: /Add Gift Aid/i }));
    expect(
      screen.getByRole("group", { name: "Gift Aid uplift summary" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Back" }));
    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(
      screen.getByRole("group", { name: "Gift Aid uplift summary" }),
    ).toBeInTheDocument();
  });

  it("returns to the previous step when Back is pressed", async () => {
    const user = userEvent.setup();
    render(<DonationWizard />);

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(
      screen.getByRole("heading", { name: "Your email" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(
      screen.getByRole("heading", { name: "Choose your donation" }),
    ).toBeInTheDocument();
  });

  it("highlights the matching breadcrumb segment for each step", async () => {
    const user = userEvent.setup();
    render(<DonationWizard />);

    const breadcrumb = () =>
      within(screen.getByRole("list", { name: "Wizard progress" }));
    const expectCurrent = (label: string) => {
      expect(breadcrumb().getByText(label)).toHaveAttribute(
        "aria-current",
        "step",
      );
    };

    expectCurrent("Select");

    await clickNext(user);
    expectCurrent("Details");

    await clickNext(user);
    expectCurrent("Details");

    await answerMarketingIfPresent(user);
    await clickNext(user);
    expectCurrent("Message");

    await clickNext(user);
    expectCurrent("Gift Aid");

    await clickNext(user);
    expectCurrent("Gift Aid");

    await clickNext(user);
    expectCurrent("Pay");

    await clickNext(user, "Pay");
    expectCurrent("Complete");
  });

  it("blocks advancing from step 3 until marketing consent is answered", async () => {
    const user = userEvent.setup();
    render(<DonationWizard />);

    await clickNext(user); // 1 → 2
    await clickNext(user); // 2 → 3
    expect(
      screen.getByRole("heading", { name: "Your details" }),
    ).toBeInTheDocument();

    await clickNext(user); // attempt 3 → 4 with no answer
    expect(screen.getByRole("alert")).toHaveTextContent(
      /Please select a contact preference/i,
    );
    expect(
      screen.getByRole("heading", { name: "Your details" }),
    ).toBeInTheDocument();

    await user.click(screen.getByLabelText(/please don't contact me/i));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    await clickNext(user); // 3 → 4 succeeds
    expect(
      screen.getByRole("heading", { name: "Leave a tribute" }),
    ).toBeInTheDocument();
  });
});
