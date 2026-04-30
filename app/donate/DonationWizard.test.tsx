import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DonationWizard } from "./DonationWizard";

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
      const next = screen.getByRole("button", {
        name: i === 6 ? "Pay" : "Next",
      });
      await user.click(next);
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
        const next = screen.getByRole("button", {
          name: i === 6 ? "Pay" : "Next",
        });
        await user.click(next);
      }
    }
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

    await user.click(screen.getByRole("button", { name: "Next" }));
    expectCurrent("Details");

    await user.click(screen.getByRole("button", { name: "Next" }));
    expectCurrent("Details");

    await user.click(screen.getByRole("button", { name: "Next" }));
    expectCurrent("Message");

    await user.click(screen.getByRole("button", { name: "Next" }));
    expectCurrent("Gift Aid");

    await user.click(screen.getByRole("button", { name: "Next" }));
    expectCurrent("Gift Aid");

    await user.click(screen.getByRole("button", { name: "Next" }));
    expectCurrent("Pay");

    await user.click(screen.getByRole("button", { name: "Pay" }));
    expectCurrent("Complete");
  });
});
