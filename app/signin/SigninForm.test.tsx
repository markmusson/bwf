import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const signIn = vi.fn();

vi.mock("@convex-dev/auth/react", () => ({
  useAuthActions: () => ({ signIn, signOut: vi.fn() }),
}));

import { SigninForm } from "./SigninForm";

describe("SigninForm", () => {
  it("renders the email field and disabled submit before input", () => {
    signIn.mockReset();
    render(<SigninForm />);
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /email me a link/i }),
    ).toBeDisabled();
  });

  it("calls signIn('resend') with the entered email and shows the sent state", async () => {
    signIn.mockReset();
    signIn.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();

    render(<SigninForm />);
    await user.type(
      screen.getByLabelText(/email address/i),
      "donor@example.com",
    );
    await user.click(screen.getByRole("button", { name: /email me a link/i }));

    expect(signIn).toHaveBeenCalledWith("resend", {
      email: "donor@example.com",
    });
    expect(
      await screen.findByRole("heading", { name: /check your inbox/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("donor@example.com")).toBeInTheDocument();
  });

  it("surfaces the error message when signIn rejects", async () => {
    signIn.mockReset();
    signIn.mockRejectedValueOnce(new Error("Resend rejected the address"));
    const user = userEvent.setup();

    render(<SigninForm />);
    await user.type(
      screen.getByLabelText(/email address/i),
      "donor@example.com",
    );
    await user.click(screen.getByRole("button", { name: /email me a link/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /Resend rejected the address/i,
    );
  });

  it("lets the donor switch email after sending", async () => {
    signIn.mockReset();
    signIn.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();

    render(<SigninForm />);
    await user.type(
      screen.getByLabelText(/email address/i),
      "donor@example.com",
    );
    await user.click(screen.getByRole("button", { name: /email me a link/i }));

    await user.click(
      await screen.findByRole("button", { name: /try a different email/i }),
    );

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
  });
});
