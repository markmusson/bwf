import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const useMutationMock = vi.fn();

vi.mock("convex/react", () => ({
  useMutation: (...args: unknown[]) => useMutationMock(...args),
}));

vi.mock("@/convex/_generated/api", () => ({
  api: {
    donations: { update: "api.donations.update" },
    tributes: { update: "api.tributes.update" },
  },
}));

import { ManageDonationCard } from "./ManageDonationCard";

const baseProps = {
  donationId: "d_1" as unknown as never,
  displayName: "Sarah Williams",
  hideName: false,
  hideAmount: false,
  amountPence: 2500,
  giftAid: false,
  tributeText: "For Bob.",
  tributeStatus: "approved" as string | null,
  seat: { stand: "hollies", row: 0, num: 4 },
};

function configureMocks(opts?: {
  donationUpdate?: ReturnType<typeof vi.fn>;
  tributeUpdate?: ReturnType<typeof vi.fn>;
}) {
  useMutationMock.mockReset();
  const updateDonation =
    opts?.donationUpdate ?? vi.fn().mockResolvedValue(null);
  const updateTribute =
    opts?.tributeUpdate ?? vi.fn().mockResolvedValue({ tributeId: "t_1" });
  useMutationMock.mockImplementation((ref: unknown) => {
    if (ref === "api.donations.update") return updateDonation;
    if (ref === "api.tributes.update") return updateTribute;
    return vi.fn();
  });
  return { updateDonation, updateTribute };
}

describe("ManageDonationCard", () => {
  it("renders the seat label, amount, and current values", () => {
    configureMocks();
    render(<ManageDonationCard {...baseProps} />);
    expect(
      screen.getByText(/Eric Hollies Stand · Row 1, Seat 5/i),
    ).toBeInTheDocument();
    expect(screen.getByText("£25.00")).toBeInTheDocument();
    expect(screen.getByLabelText(/Display name/i)).toHaveValue(
      "Sarah Williams",
    );
    expect(screen.getByLabelText(/Tribute/i)).toHaveValue("For Bob.");
    expect(screen.getByText(/Tribute on the wall/i)).toBeInTheDocument();
  });

  it("disables Save when nothing has changed", () => {
    configureMocks();
    render(<ManageDonationCard {...baseProps} />);
    expect(
      screen.getByRole("button", { name: /Save changes/i }),
    ).toBeDisabled();
  });

  it("calls donations.update with only the changed fields", async () => {
    const { updateDonation, updateTribute } = configureMocks();
    const user = userEvent.setup();
    render(<ManageDonationCard {...baseProps} />);

    await user.click(screen.getByLabelText(/Hide my name/i));
    await user.click(screen.getByRole("button", { name: /Save changes/i }));

    expect(updateDonation).toHaveBeenCalledWith({
      donationId: baseProps.donationId,
      hideName: true,
    });
    expect(updateTribute).not.toHaveBeenCalled();
    expect(await screen.findByTestId("save-confirmation")).toBeInTheDocument();
  });

  it("calls tributes.update when the tribute text changes", async () => {
    const { updateDonation, updateTribute } = configureMocks();
    const user = userEvent.setup();
    render(<ManageDonationCard {...baseProps} />);

    const textarea = screen.getByLabelText(/Tribute/i);
    await user.clear(textarea);
    await user.type(textarea, "Edited tribute.");
    await user.click(screen.getByRole("button", { name: /Save changes/i }));

    expect(updateTribute).toHaveBeenCalledWith({
      donationId: baseProps.donationId,
      text: "Edited tribute.",
    });
    expect(updateDonation).not.toHaveBeenCalled();
  });

  it("surfaces an error when a mutation rejects", async () => {
    configureMocks({
      donationUpdate: vi.fn().mockRejectedValue(new Error("Forbidden")),
    });
    const user = userEvent.setup();
    render(<ManageDonationCard {...baseProps} />);

    await user.click(screen.getByLabelText(/Hide my donation amount/i));
    await user.click(screen.getByRole("button", { name: /Save changes/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/Forbidden/);
  });
});
